from sqlmodel import Session, select

from modules.fichas.application.cambio_service import CambioService
from modules.fichas.application.causa_service import CausaService
from modules.fichas.application.comparacion_service import ComparacionService
from modules.fichas.application.oportunidad_service import OportunidadService
from modules.fichas.application.organizacion_service import OrganizacionService
from modules.fichas.infrastructure.models import Proceso
from shared.semaforo import calcular_semaforo


class ResultadosService:
    """
    Resultados del análisis: qué dio cada indicador y qué pasó con los procesos
    a los que se les aplicó una mejora.

    Es la vista de cierre del ciclo — el tablero muestra el estado actual, este
    servicio muestra el efecto de lo que se hizo: causas diagnosticadas,
    oportunidades priorizadas, acciones de cambio ejecutadas y la comparación
    antes/después de cada indicador intervenido.
    """

    @staticmethod
    def consolidado(session: Session) -> dict:
        org = OrganizacionService.actual(session)
        procesos = sorted(
            session.exec(
                select(Proceso).where(
                    Proceso.organizacion_id == org.id,
                    Proceso.activo == True,  # noqa: E712
                )
            ).all(),
            key=lambda p: p.codigo,
        )

        resultados = [ResultadosService._resultado_proceso(session, p) for p in procesos]
        # Solo interesan los procesos que tienen algo que reportar: indicadores
        # medidos o trabajo de mejora registrado.
        resultados = [r for r in resultados if r["indicadores"] or r["mejora"]["tiene_algo"]]

        return {
            "organizacion": {"nombre": org.nombre, "sector": org.sector},
            "resumen": ResultadosService._resumen(resultados),
            "procesos": resultados,
        }

    # ------------------------------------------------------------------ #
    # Resultado por proceso                                              #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _resultado_proceso(session: Session, proceso: Proceso) -> dict:
        comparacion = ComparacionService.comparacion(session, proceso.codigo)
        causas = CausaService.listar(session, proceso.codigo)
        oportunidades = OportunidadService.listar(session, proceso.codigo)
        cambio = CambioService.listar(session, proceso.codigo)

        causas_raiz = [
            c for lista in causas["ishikawa"].values() for c in lista if c["es_raiz"]
        ]
        implementadas = [o for o in oportunidades if o["estado"] == "implementada"]

        indicadores = [
            ResultadosService._resultado_indicador(ind) for ind in comparacion["indicadores"]
        ]

        mejora = {
            "causas": len(causas["pareto"]["items"]),
            "causas_raiz": len(causas_raiz),
            "oportunidades": len(oportunidades),
            "implementadas": len(implementadas),
            "acciones": cambio["progreso"]["total"],
            "acciones_hechas": cambio["progreso"]["hechas"],
            "avance_cambio": cambio["progreso"]["porcentaje"],
            "con_proyeccion": sum(1 for i in indicadores if i["proyectado"] is not None),
        }
        mejora["tiene_algo"] = any(
            mejora[k] for k in ("causas", "oportunidades", "acciones", "con_proyeccion")
        )
        mejora["etapa"] = ResultadosService._etapa(mejora)

        return {
            "codigo": proceso.codigo,
            "nombre": proceso.nombre,
            "modulo": proceso.codigo.split(".")[0],
            "indicadores": indicadores,
            "mejora": mejora,
            "causas_raiz": [c["descripcion"] for c in causas_raiz],
            "acciones_implementadas": [
                {"descripcion": o["descripcion"], "accion": o["accion_propuesta"], "plazo": o["plazo"]}
                for o in implementadas
            ],
        }

    @staticmethod
    def _resultado_indicador(comparado: dict) -> dict:
        """Aplana la comparación en una fila de resultado antes/después."""
        real = comparado["real"]
        ultimo = real[-1] if real else None
        mejora = comparado["mejora"]

        return {
            "id": comparado["id"],
            "nombre": comparado["nombre"],
            "unidad": comparado["unidad"],
            "meta_final": comparado["meta_final"],
            "mes_corte": ultimo["mes"] if ultimo else None,
            "obtenido": ultimo["valor"] if ultimo else None,
            # El semáforo del indicador es su avance T1 (cumplimiento del
            # esperado mensual), el mismo criterio que el tablero y el dashboard.
            "avance": comparado["avance_t1"],
            "semaforo": comparado["semaforo_t1"] if real else "Sin datos",
            # Cuánto de la meta de fin de año lleva alcanzado: acompaña al
            # Antes/Después, pero no decide el color del indicador.
            "avance_meta_final": ultimo["avance"] if ultimo else None,
            "mediciones": len(real),
            # Efecto esperado de la mejora; None si aún no se proyectó.
            "proyectado": mejora["valor_despues"] if mejora else None,
            "avance_proyectado": (
                round(100 - mejora["brecha_proyectada"], 1) if mejora else None
            ),
            "semaforo_proyectado": mejora["semaforo_despues"] if mejora else None,
            "ganancia_pp": mejora["mejora_pp"] if mejora else None,
            "mes_alcanza_meta": mejora["mes_alcanza_meta"] if mejora else None,
        }

    @staticmethod
    def _etapa(mejora: dict) -> str:
        """En qué punto del ciclo de mejora está el proceso, para ordenar el informe."""
        if not mejora["tiene_algo"]:
            return "sin_iniciar"
        if mejora["acciones_hechas"] and mejora["acciones_hechas"] == mejora["acciones"]:
            return "implementada"
        if mejora["acciones"]:
            return "en_ejecucion"
        if mejora["con_proyeccion"]:
            return "proyectada"
        if mejora["oportunidades"]:
            return "priorizada"
        return "diagnosticada"

    # ------------------------------------------------------------------ #
    # Resumen global                                                     #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _resumen(resultados: list[dict]) -> dict:
        indicadores = [i for r in resultados for i in r["indicadores"]]
        con_avance = [i["avance"] for i in indicadores if i["avance"] is not None]
        promedio = round(sum(con_avance) / len(con_avance), 1) if con_avance else None

        intervenidos = [i for i in indicadores if i["ganancia_pp"] is not None]
        ganancia = (
            round(sum(i["ganancia_pp"] for i in intervenidos) / len(intervenidos), 1)
            if intervenidos else None
        )
        proyectados = [i["avance_proyectado"] for i in intervenidos]
        promedio_proyectado = round(sum(proyectados) / len(proyectados), 1) if proyectados else None

        con_mejora = [r for r in resultados if r["mejora"]["tiene_algo"]]

        return {
            "procesos": len(resultados),
            "indicadores": len(indicadores),
            "avance_promedio": promedio,
            "semaforo_global": calcular_semaforo(promedio),
            "cumplen_meta": sum(1 for i in indicadores if i["semaforo"] == "Verde"),
            "no_cumplen": sum(1 for i in indicadores if i["semaforo"] == "Rojo"),
            "procesos_con_mejora": len(con_mejora),
            "procesos_implementados": sum(
                1 for r in con_mejora if r["mejora"]["etapa"] == "implementada"
            ),
            "indicadores_intervenidos": len(intervenidos),
            "ganancia_promedio_pp": ganancia,
            "avance_proyectado": promedio_proyectado,
            "semaforo_proyectado": calcular_semaforo(promedio_proyectado),
        }

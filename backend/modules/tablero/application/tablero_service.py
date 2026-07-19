from sqlmodel import Session, select

from modules.fichas.application.organizacion_service import OrganizacionService
from modules.fichas.infrastructure.models import (
    AccionCambio,
    Causa,
    FichaIndicador,
    Medicion,
    Oportunidad,
    Proceso,
)
from modules.procesos.application.proceso_service import ProcesoService
from modules.procesos.infrastructure.excel_reader import derivar_obtenido
from shared.meses import orden_mes
from shared.periodo import clave_periodo, etiqueta_periodo, meses_periodo
from shared.semaforo import calcular_semaforo

# Variación mínima (en unidades del indicador) para llamar tendencia a un cambio.
_UMBRAL_TENDENCIA = 0.5


class TableroService:
    """
    Tablero de control para monitoreo: una fila por indicador con su estado
    real frente a la meta, en lugar de los promedios agregados del dashboard.

    El dashboard responde "¿cómo va la institución?"; el tablero responde
    "¿qué indicador concreto está fallando y quién lo atiende?". Por eso aquí
    la unidad de análisis es el indicador y no el proceso.
    """

    @staticmethod
    def monitoreo(session: Session, periodo: str | None = None) -> dict:
        org = OrganizacionService.actual(session)
        meses = meses_periodo(periodo)

        procesos = {
            p.id: p for p in session.exec(
                select(Proceso).where(
                    Proceso.organizacion_id == org.id,
                    Proceso.activo == True,  # noqa: E712
                )
            ).all()
        }
        indicadores = [
            ind for ind in session.exec(
                select(FichaIndicador).where(FichaIndicador.activo == True)  # noqa: E712
            ).all()
            if ind.proceso_id in procesos
        ]

        # Procesos con algún trabajo de mejora abierto: se marca en la fila para
        # distinguir "en rojo y sin atender" de "en rojo pero ya intervenido".
        con_mejora = TableroService._procesos_con_mejora(session, set(procesos))

        filas = [
            TableroService._fila(session, ind, procesos[ind.proceso_id], meses, con_mejora)
            for ind in indicadores
        ]
        filas.sort(key=lambda f: (f["avance"] is not None, f["avance"] if f["avance"] is not None else 0))

        return {
            "periodo": {
                "clave": clave_periodo(periodo),
                "etiqueta": etiqueta_periodo(periodo),
                "meses": meses,
            },
            "resumen": TableroService._resumen(filas),
            "por_modulo": TableroService._por_modulo(filas),
            "indicadores": filas,
        }

    # ------------------------------------------------------------------ #
    # Fila del tablero                                                   #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _fila(
        session: Session,
        indicador: FichaIndicador,
        proceso: Proceso,
        meses: list[str],
        con_mejora: set[int],
    ) -> dict:
        unidad = indicador.unidad or ""
        es_descendente = "descendente" in (indicador.sentido or "").lower()

        serie = TableroService._serie(session, indicador, meses, unidad)
        ultimo = serie[-1] if serie else None
        previo = serie[-2] if len(serie) > 1 else None

        avance = None
        if ultimo is not None and indicador.meta_final is not None:
            avance = ProcesoService.calcular_avance_t1(
                ultimo["valor"], indicador.meta_final, es_descendente
            )

        # Cumplimiento del compromiso mensual: cuántos meses del periodo se
        # alcanzó el resultado esperado. Complementa al avance contra la meta
        # final, que solo mira la foto del mes de corte.
        cumplidos = sum(1 for p in serie if p["cumple_esperado"] is True)
        evaluables = sum(1 for p in serie if p["cumple_esperado"] is not None)

        return {
            "indicador_id": indicador.id,
            "codigo": proceso.codigo,
            "proceso": proceso.nombre,
            "modulo": proceso.codigo.split(".")[0],
            "indicador": indicador.nombre,
            "tipo": indicador.tipo,
            "responsable": indicador.responsable,
            "unidad": indicador.unidad,
            "sentido": indicador.sentido or "Ascendente",
            "es_descendente": es_descendente,
            "meta_final": indicador.meta_final,
            "linea_base": indicador.linea_base,
            "relevancia": indicador.relevancia,
            "mes_corte": ultimo["mes"] if ultimo else None,
            "valor_actual": ultimo["valor"] if ultimo else None,
            "valor_previo": previo["valor"] if previo else None,
            "avance": round(avance, 1) if avance is not None else None,
            "semaforo": calcular_semaforo(avance),
            "brecha": TableroService._brecha(ultimo, indicador.meta_final, es_descendente),
            "tendencia": TableroService._tendencia(ultimo, previo, es_descendente),
            "meses_cumplidos": cumplidos,
            "meses_evaluados": evaluables,
            "cumplimiento_mensual": round(cumplidos / evaluables * 100, 1) if evaluables else None,
            "tiene_mejora": proceso.id in con_mejora,
            "serie": serie,
        }

    @staticmethod
    def _serie(session: Session, indicador: FichaIndicador, meses: list[str], unidad: str) -> list[dict]:
        es_descendente = "descendente" in (indicador.sentido or "").lower()
        mediciones = sorted(
            (
                m for m in session.exec(
                    select(Medicion).where(Medicion.indicador_id == indicador.id)
                ).all()
                if m.mes in meses
            ),
            key=lambda m: orden_mes(m.mes),
        )

        serie = []
        for m in mediciones:
            valor = derivar_obtenido(m.numerador, m.denominador, unidad, m.resultado_obtenido)
            if valor is None:
                continue
            esperado = m.resultado_esperado
            cumple = None
            if esperado is not None:
                cumple = valor <= esperado if es_descendente else valor >= esperado
            serie.append({
                "mes": m.mes,
                "anio": m.anio,
                "valor": valor,
                "esperado": esperado,
                "cumple_esperado": cumple,
            })
        return serie

    @staticmethod
    def _brecha(ultimo: dict | None, meta: float | None, es_descendente: bool) -> float | None:
        """Distancia a la meta en unidades del indicador. 0 = meta alcanzada."""
        if ultimo is None or meta is None:
            return None
        diferencia = meta - ultimo["valor"] if not es_descendente else ultimo["valor"] - meta
        return round(max(0.0, diferencia), 2)

    @staticmethod
    def _tendencia(ultimo: dict | None, previo: dict | None, es_descendente: bool) -> str:
        if ultimo is None or previo is None:
            return "sin_datos"
        delta = ultimo["valor"] - previo["valor"]
        if abs(delta) < _UMBRAL_TENDENCIA:
            return "estable"
        # En descendente, bajar es mejorar.
        mejora = delta < 0 if es_descendente else delta > 0
        return "mejora" if mejora else "retroceso"

    # ------------------------------------------------------------------ #
    # Agregados                                                          #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _resumen(filas: list[dict]) -> dict:
        def contar(color):
            return sum(1 for f in filas if f["semaforo"] == color)

        con_datos = [f for f in filas if f["avance"] is not None]
        promedio = round(sum(f["avance"] for f in con_datos) / len(con_datos), 1) if con_datos else None

        return {
            "total": len(filas),
            "verde": contar("Verde"),
            "amarillo": contar("Amarillo"),
            "rojo": contar("Rojo"),
            "sin_datos": contar("Sin datos"),
            "avance_promedio": promedio,
            "semaforo_global": calcular_semaforo(promedio),
            "en_retroceso": sum(1 for f in filas if f["tendencia"] == "retroceso"),
            "criticos_sin_mejora": sum(
                1 for f in filas if f["semaforo"] == "Rojo" and not f["tiene_mejora"]
            ),
        }

    @staticmethod
    def _por_modulo(filas: list[dict]) -> list[dict]:
        modulos: dict[str, list[dict]] = {}
        for f in filas:
            modulos.setdefault(f["modulo"], []).append(f)

        resumen = []
        for modulo in sorted(modulos):
            grupo = modulos[modulo]
            con_datos = [f["avance"] for f in grupo if f["avance"] is not None]
            avance = round(sum(con_datos) / len(con_datos), 1) if con_datos else None
            resumen.append({
                "modulo": modulo,
                "indicadores": len(grupo),
                "avance": avance,
                "semaforo": calcular_semaforo(avance),
                "rojos": sum(1 for f in grupo if f["semaforo"] == "Rojo"),
            })
        return resumen

    @staticmethod
    def _procesos_con_mejora(session: Session, proceso_ids: set[int]) -> set[int]:
        """
        Procesos con algún trabajo de mejora registrado. Se cuenta igual que en
        las alertas autónomas —diagnosticar causas ya es empezar a atender el
        problema—, para que ambas vistas no se contradigan sobre el mismo proceso.
        """
        registrados: list[int] = []
        for modelo in (Causa, Oportunidad, AccionCambio):
            registrados.extend(
                session.exec(
                    select(modelo.proceso_id).where(modelo.activo == True)  # noqa: E712
                ).all()
            )
        return {pid for pid in registrados if pid in proceso_ids}

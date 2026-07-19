from sqlmodel import Session

from modules.fichas.application.alertas_service import AlertasMejoraService
from modules.fichas.application.cambio_service import CambioService
from modules.fichas.application.causa_service import CausaService
from modules.fichas.application.ficha_proceso_service import FichaProcesoService
from modules.fichas.application.oportunidad_service import OportunidadService
from modules.fichas.application.organizacion_service import OrganizacionService
from modules.procesos.application.proceso_service import ProcesoService
from modules.procesos.infrastructure.excel_reader import ExcelStore
from modules.tablero.application.resultados_service import ResultadosService
from modules.tablero.application.tablero_service import TableroService
from shared.semaforo import calcular_semaforo


def _n(valor, sufijo="") -> str:
    return f"{valor}{sufijo}" if valor is not None else "sin dato"


class ContextoService:
    """
    Traduce los datos del sistema a texto compacto para el prompt de la IA.

    Se envía texto plano —no JSON— porque el modelo razona mejor sobre tablas
    legibles y consume menos tokens. Cada sección arma solo lo que necesita:
    mandar todo el estado en cada consulta encarece la llamada sin mejorar la
    respuesta.
    """

    # ------------------------------------------------------------------ #
    # Por sección                                                        #
    # ------------------------------------------------------------------ #

    @staticmethod
    def tablero(session: Session, periodo: str | None = None) -> str:
        data = TableroService.monitoreo(session, periodo)
        r = data["resumen"]

        lineas = [
            f"TABLERO DE MONITOREO — periodo {data['periodo']['etiqueta']}",
            f"Indicadores: {r['total']} | Verde {r['verde']} · Ámbar {r['amarillo']} · "
            f"Rojo {r['rojo']} · Sin datos {r['sin_datos']}",
            f"Avance promedio contra meta: {_n(r['avance_promedio'], '%')} ({r['semaforo_global']})",
            f"En retroceso: {r['en_retroceso']} | Críticos sin plan de mejora: {r['criticos_sin_mejora']}",
            "",
            "DETALLE POR INDICADOR:",
        ]
        for f in data["indicadores"]:
            lineas.append(
                f"- {f['codigo']} | {f['indicador']} | meta {_n(f['meta_final'])}{f['unidad'] or ''}"
                f" | actual {_n(f['valor_actual'])} a {f['mes_corte'] or 'sin mes'}"
                f" | avance {_n(f['avance'], '%')} ({f['semaforo']})"
                f" | tendencia {f['tendencia']}"
                f" | cumplió el esperado {f['meses_cumplidos']}/{f['meses_evaluados']} meses"
                f" | {'con' if f['tiene_mejora'] else 'SIN'} plan de mejora"
            )
        return "\n".join(lineas)

    @staticmethod
    def resultados(session: Session) -> str:
        data = ResultadosService.consolidado(session)
        r = data["resumen"]

        lineas = [
            "RESULTADOS DEL ANÁLISIS",
            f"Procesos evaluados: {r['procesos']} | Indicadores: {r['indicadores']}",
            f"Avance promedio: {_n(r['avance_promedio'], '%')} ({r['semaforo_global']}) | "
            f"cumplen meta {r['cumplen_meta']} · no cumplen {r['no_cumplen']}",
            f"Procesos con mejora registrada: {r['procesos_con_mejora']} "
            f"(implementada por completo: {r['procesos_implementados']})",
            f"Indicadores intervenidos: {r['indicadores_intervenidos']} | "
            f"ganancia promedio proyectada: {_n(r['ganancia_promedio_pp'], ' pp')}",
            "",
            "POR PROCESO:",
        ]
        for p in data["procesos"]:
            m = p["mejora"]
            lineas.append(
                f"- {p['codigo']} {p['nombre']} | etapa de mejora: {m['etapa']}"
                f" | causas {m['causas']} (raíz {m['causas_raiz']})"
                f" | oportunidades {m['oportunidades']} (implementadas {m['implementadas']})"
                f" | acciones de cambio {m['acciones_hechas']}/{m['acciones']}"
            )
            for i in p["indicadores"]:
                extra = ""
                if i["ganancia_pp"] is not None:
                    extra = (
                        f" → proyectado {_n(i['proyectado'])} "
                        f"({i['semaforo_proyectado']}, +{i['ganancia_pp']} pp"
                        f"{', alcanza meta en ' + i['mes_alcanza_meta'] if i['mes_alcanza_meta'] else ''})"
                    )
                lineas.append(
                    f"    · {i['nombre']}: obtenido {_n(i['obtenido'])} vs meta {_n(i['meta_final'])}"
                    f" | avance {_n(i['avance'], '%')} ({i['semaforo']}){extra}"
                )
            if p["causas_raiz"]:
                lineas.append(f"    causas raíz: {'; '.join(p['causas_raiz'][:5])}")
        return "\n".join(lineas)

    @staticmethod
    def pareto() -> str:
        items = ProcesoService.calcular_pareto(ExcelStore.get_all())
        if not items:
            return "No hay datos suficientes para el análisis de Pareto."

        lineas = [
            "ANÁLISIS DE PARETO — criticidad por brecha de avance (100 − avance T1 promedio)",
            "El 80% acumulado marca los procesos que concentran el incumplimiento.",
            "",
        ]
        for i, item in enumerate(items, start=1):
            marca = " ← dentro del 80% crítico" if item["porcentaje_acumulado"] <= 80 else ""
            lineas.append(
                f"{i}. {item['codigo']} {item['proceso']} | brecha {item['brecha_pareto']} pp"
                f" | acumulado {item['porcentaje_acumulado']}%{marca}"
            )
        return "\n".join(lineas)

    @staticmethod
    def predicciones() -> str:
        todos = ExcelStore.get_all()
        grupos: dict[str, list[dict]] = {}
        for r in todos:
            grupos.setdefault(r["codigo_proceso"], []).append(r)

        lineas = [
            "PROYECCIÓN A DICIEMBRE — regresión lineal sobre los meses reportados",
            "",
        ]
        for codigo, registros in sorted(grupos.items()):
            pred = ProcesoService.calcular_prediccion(registros)
            if pred is None:
                lineas.append(f"- {codigo}: sin datos suficientes para proyectar (mín. 2 meses)")
                continue
            estado = (
                "ALCANZARÁ la meta" if pred["alcanzara_meta"]
                else "NO alcanzará la meta" if pred["alcanzara_meta"] is False
                else "meta no definida"
            )
            lineas.append(
                f"- {codigo} {registros[0]['proceso']} | tendencia {pred['tendencia']}"
                f" (pendiente {pred['pendiente']:+.2f}/mes, R²={pred['r_cuadrado']})"
                f" | valor estimado a diciembre {_n(pred['valor_diciembre'])}"
                f" vs meta {_n(pred['meta_final'])} → {estado}"
                f"{', cruza la meta en ' + pred['mes_alcanza_meta'] if pred.get('mes_alcanza_meta') else ''}"
            )
        return "\n".join(lineas)

    @staticmethod
    def mejora(session: Session, codigo: str) -> str:
        """Estado completo del ciclo de mejora de un proceso concreto."""
        ficha = FichaProcesoService.obtener(session, codigo)
        causas = CausaService.listar(session, codigo)
        oportunidades = OportunidadService.listar(session, codigo)
        cambio = CambioService.listar(session, codigo)

        lineas = [
            f"PROCESO {ficha['codigo']} — {ficha['nombre_proceso']}",
            f"Objetivo: {ficha['objetivo'] or 'no definido'}",
            f"Dueño: {ficha['dueno'] or 'no asignado'} | Tipo: {ficha['tipo'] or 'no definido'}",
        ]
        if ficha["entradas"] or ficha["salidas"]:
            lineas.append(f"Entradas: {', '.join(ficha['entradas']) or '—'}")
            lineas.append(f"Salidas: {', '.join(ficha['salidas']) or '—'}")
        if ficha["riesgos"]:
            lineas.append(f"Riesgos declarados: {', '.join(ficha['riesgos'])}")

        lineas.append("\nCAUSAS IDENTIFICADAS (Ishikawa 6M):")
        for categoria, items in causas["ishikawa"].items():
            if items:
                for c in items:
                    raiz = " [CAUSA RAÍZ]" if c["es_raiz"] else ""
                    lineas.append(f"- {categoria}: {c['descripcion']} (peso {c['peso']}){raiz}")
        if not any(causas["ishikawa"].values()):
            lineas.append("- ninguna registrada todavía")

        lineas.append("\nOPORTUNIDADES DE MEJORA:")
        for o in oportunidades:
            lineas.append(
                f"- {o['descripcion']} | acción: {o['accion_propuesta'] or '—'}"
                f" | F={o['factibilidad']} ({o['plazo']}) | riesgo {o['nivel_riesgo']}"
                f" | estado {o['estado']}"
            )
        if not oportunidades:
            lineas.append("- ninguna registrada todavía")

        lineas.append(
            f"\nGESTIÓN DEL CAMBIO (Lewin): {cambio['progreso']['hechas']}/"
            f"{cambio['progreso']['total']} acciones hechas "
            f"({cambio['progreso']['porcentaje']}%)"
        )
        for etapa, acciones in cambio["acciones"].items():
            for a in acciones:
                lineas.append(f"- [{etapa}] {a['descripcion']} — {a['estado']}")

        return "\n".join(lineas)

    # ------------------------------------------------------------------ #
    # Global — para el informe ejecutivo                                 #
    # ------------------------------------------------------------------ #

    @staticmethod
    def global_(session: Session, periodo: str | None = None) -> str:
        org = OrganizacionService.actual(session)
        alertas = AlertasMejoraService.evaluar(session, periodo)

        bloques = [
            f"ENTIDAD: {org.nombre} | Sector: {org.sector or 'no declarado'}",
            "",
            ContextoService.tablero(session, periodo),
            "",
            ContextoService.pareto(),
            "",
            ContextoService.predicciones(),
            "",
            ContextoService.resultados(session),
            "",
            f"ALERTAS AUTÓNOMAS ({alertas['periodo']['etiqueta']}): "
            f"{alertas['resumen']['criticos']} críticas, {alertas['resumen']['atencion']} en atención",
        ]
        for a in alertas["alertas"]:
            bloques.append(
                f"- {a['codigo']} {a['nombre']} [{a['nivel']}]: {'; '.join(a['motivos'])}"
                f" → siguiente paso: {a['sugerencia']['texto']}"
            )
        return "\n".join(bloques)

    # ------------------------------------------------------------------ #
    # Estado general resumido — para el chat y las sugerencias           #
    # ------------------------------------------------------------------ #

    @staticmethod
    def resumen_procesos() -> str:
        todos = ExcelStore.get_all()
        if not todos:
            return "No hay procesos con mediciones cargadas."

        grupos: dict[str, list[dict]] = {}
        for r in todos:
            grupos.setdefault(r["codigo_proceso"], []).append(r)

        lineas = []
        for codigo, registros in sorted(grupos.items()):
            avance = ProcesoService.calcular_promedios(registros)["promedio_avance_t1"]
            lineas.append(
                f"- {codigo} {registros[0]['proceso']}: avance {_n(avance, '%')} "
                f"({calcular_semaforo(avance)})"
            )
        return "\n".join(lineas)

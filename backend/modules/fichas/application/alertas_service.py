from sqlmodel import Session, select

from modules.fichas.application.organizacion_service import OrganizacionService
from modules.fichas.infrastructure.models import (
    AccionCambio,
    Causa,
    FichaIndicador,
    Medicion,
    Oportunidad,
    Proceso,
    Proyeccion,
)
from modules.procesos.application.proceso_service import ProcesoService
from modules.procesos.infrastructure.excel_reader import derivar_obtenido
from shared.meses import orden_mes
from shared.semaforo import calcular_semaforo


class AlertasMejoraService:
    """
    Detección autónoma de procesos que deberían implementar mejoras (Mejora V).

    Recorre todos los procesos de la organización, evalúa el último desempeño de
    sus indicadores y prioriza los que están en rojo/ámbar, sugiriendo el
    siguiente paso de mejora según lo que aún falte.
    """

    @staticmethod
    def evaluar(session: Session) -> dict:
        org = OrganizacionService.actual(session)
        procesos = session.exec(
            select(Proceso).where(
                Proceso.organizacion_id == org.id,
                Proceso.activo == True,  # noqa: E712
            )
        ).all()

        alertas = [
            alerta
            for proceso in procesos
            if (alerta := AlertasMejoraService._evaluar_proceso(session, proceso)) is not None
        ]
        alertas.sort(key=lambda a: a["puntaje"], reverse=True)

        return {
            "resumen": {
                "criticos": sum(1 for a in alertas if a["nivel"] == "critico"),
                "atencion": sum(1 for a in alertas if a["nivel"] == "atencion"),
                "total": len(alertas),
            },
            "alertas": alertas,
        }

    # ------------------------------------------------------------------ #
    # Evaluación por proceso                                             #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _evaluar_proceso(session: Session, proceso: Proceso) -> dict | None:
        indicadores = session.exec(
            select(FichaIndicador).where(
                FichaIndicador.proceso_id == proceso.id,
                FichaIndicador.activo == True,  # noqa: E712
            )
        ).all()
        if not indicadores:
            return None

        avances = [
            av for ind in indicadores
            if (av := AlertasMejoraService._ultimo_avance(session, ind)) is not None
        ]
        if not avances:
            return None  # sin mediciones utilizables: no se puede evaluar el desempeño

        rojos = sum(1 for a in avances if a["semaforo"] == "Rojo")
        amarillos = sum(1 for a in avances if a["semaforo"] == "Amarillo")
        if rojos > 0:
            nivel = "critico"
        elif amarillos > 0:
            nivel = "atencion"
        else:
            return None  # todos en verde: no requiere mejora

        brechas = [max(0.0, 100 - a["avance"]) for a in avances]
        brecha_prom = round(sum(brechas) / len(brechas), 1)
        peor_avance = round(min(a["avance"] for a in avances), 1)

        mejora = AlertasMejoraService._estado_mejora(session, proceso, [i.id for i in indicadores])

        puntaje = brecha_prom + rojos * 15 + amarillos * 5
        if not mejora["tiene_algo"] and nivel == "critico":
            puntaje += 20

        motivos = []
        if rojos:
            motivos.append(f"{rojos} indicador(es) en rojo")
        if amarillos:
            motivos.append(f"{amarillos} en ámbar")
        motivos.append(f"brecha promedio de {brecha_prom} pp vs la meta")
        if not mejora["tiene_algo"]:
            motivos.append("sin análisis de mejora registrado")

        return {
            "codigo": proceso.codigo,
            "nombre": proceso.nombre,
            "nivel": nivel,
            "rojos": rojos,
            "amarillos": amarillos,
            "brecha_promedio": brecha_prom,
            "peor_avance": peor_avance,
            "indicadores_evaluados": len(avances),
            "tiene_mejora": mejora["tiene_algo"],
            "motivos": motivos,
            "sugerencia": AlertasMejoraService._sugerencia(mejora),
            "puntaje": round(puntaje, 1),
        }

    @staticmethod
    def _ultimo_avance(session: Session, indicador: FichaIndicador) -> dict | None:
        """Avance T1 y semáforo de la última medición con valor. None si no evaluable."""
        if indicador.meta_final is None:
            return None
        unidad = indicador.unidad or ""
        mediciones = sorted(
            session.exec(select(Medicion).where(Medicion.indicador_id == indicador.id)).all(),
            key=lambda m: orden_mes(m.mes),
        )
        valor = None
        for m in reversed(mediciones):
            v = derivar_obtenido(m.numerador, m.denominador, unidad, m.resultado_obtenido)
            if v is not None:
                valor = v
                break
        if valor is None:
            return None

        es_descendente = "descendente" in (indicador.sentido or "").lower()
        avance = ProcesoService.calcular_avance_t1(valor, indicador.meta_final, es_descendente)
        if avance is None:
            return None
        return {"avance": avance, "semaforo": calcular_semaforo(avance)}

    # ------------------------------------------------------------------ #
    # Estado de la mejora y siguiente paso sugerido                      #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _estado_mejora(session: Session, proceso: Proceso, indicador_ids: list[int]) -> dict:
        causas = session.exec(
            select(Causa).where(Causa.proceso_id == proceso.id, Causa.activo == True)  # noqa: E712
        ).first()
        oportunidades = session.exec(
            select(Oportunidad).where(Oportunidad.proceso_id == proceso.id, Oportunidad.activo == True)  # noqa: E712
        ).first()
        acciones = session.exec(
            select(AccionCambio).where(AccionCambio.proceso_id == proceso.id, AccionCambio.activo == True)  # noqa: E712
        ).first()
        proyeccion = None
        if indicador_ids:
            proyeccion = session.exec(
                select(Proyeccion).where(Proyeccion.indicador_id.in_(indicador_ids))
            ).first()

        estado = {
            "causas": causas is not None,
            "oportunidades": oportunidades is not None,
            "proyeccion": proyeccion is not None,
            "acciones": acciones is not None,
        }
        estado["tiene_algo"] = any(estado.values())
        return estado

    @staticmethod
    def _sugerencia(mejora: dict) -> dict:
        if not mejora["causas"]:
            return {"tab": "ishikawa", "texto": "Empieza por el diagnóstico de causas (Ishikawa)"}
        if not mejora["oportunidades"]:
            return {"tab": "oportunidades", "texto": "Define oportunidades priorizadas (F=C×I)"}
        if not mejora["proyeccion"]:
            return {"tab": "comparacion", "texto": "Proyecta la mejora esperada (Antes/Después)"}
        if not mejora["acciones"]:
            return {"tab": "cambio", "texto": "Planifica la gestión del cambio (Kurt Lewin)"}
        return {"tab": "cambio", "texto": "Da seguimiento a las acciones de cambio en curso"}

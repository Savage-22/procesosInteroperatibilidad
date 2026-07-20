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
from shared.periodo import clave_periodo, etiqueta_periodo, meses_periodo
from shared.semaforo import calcular_semaforo


class AlertasMejoraService:
    """
    Detección autónoma de procesos que deberían implementar mejoras (Mejora V).

    Evaluación **semestral**: para cada indicador se toma el desempeño en el
    **mes de corte** —el último mes con dato dentro del periodo (Ene–Jun)— y se
    calcula su avance T1 (obtenido vs. **esperado de ese mes**), el mismo
    criterio que usan el dashboard, el tablero y el detalle del proceso. Si en
    el mes de corte no alcanzó lo esperado (semáforo Ámbar/Rojo) el proceso
    entra a la lista de mejora, priorizado por urgencia y con el siguiente paso
    sugerido según lo que aún falte.

    Antes se comparaba contra la meta final anual, lo que marcaba en ámbar
    procesos que venían cumpliendo mes a mes: el dashboard los pedía mejorar
    mientras su detalle los mostraba en verde.
    """

    @staticmethod
    def evaluar(session: Session, periodo: str | None = None) -> dict:
        org = OrganizacionService.actual(session)
        meses = meses_periodo(periodo)
        procesos = session.exec(
            select(Proceso).where(
                Proceso.organizacion_id == org.id,
                Proceso.activo == True,  # noqa: E712
            )
        ).all()

        alertas = [
            alerta
            for proceso in procesos
            if (alerta := AlertasMejoraService._evaluar_proceso(session, proceso, meses)) is not None
        ]
        alertas.sort(key=lambda a: a["puntaje"], reverse=True)

        return {
            "periodo": {
                "clave": clave_periodo(periodo),
                "etiqueta": etiqueta_periodo(periodo),
                "meses": meses,
            },
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
    def _evaluar_proceso(session: Session, proceso: Proceso, meses: list[str]) -> dict | None:
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
            if (av := AlertasMejoraService._avance_corte(session, ind, meses)) is not None
        ]
        if not avances:
            return None  # sin mediciones dentro del periodo: no se puede evaluar

        rojos = sum(1 for a in avances if a["semaforo"] == "Rojo")
        amarillos = sum(1 for a in avances if a["semaforo"] == "Amarillo")
        if rojos > 0:
            nivel = "critico"
        elif amarillos > 0:
            nivel = "atencion"
        else:
            return None  # todos cumplen la meta en el corte: no requiere mejora

        brechas = [max(0.0, 100 - a["avance"]) for a in avances]
        brecha_prom = round(sum(brechas) / len(brechas), 1)
        peor_avance = round(min(a["avance"] for a in avances), 1)
        # Mes de corte del proceso: el más avanzado entre sus indicadores
        mes_corte = max((a["mes"] for a in avances), key=orden_mes)

        mejora = AlertasMejoraService._estado_mejora(session, proceso, [i.id for i in indicadores])

        puntaje = brecha_prom + rojos * 15 + amarillos * 5
        if not mejora["tiene_algo"] and nivel == "critico":
            puntaje += 20

        motivos = []
        if rojos:
            motivos.append(f"{rojos} indicador(es) en rojo")
        if amarillos:
            motivos.append(f"{amarillos} en ámbar")
        motivos.append(f"no alcanzó lo esperado a {mes_corte} (brecha promedio {brecha_prom} pp)")
        if not mejora["tiene_algo"]:
            motivos.append("sin análisis de mejora registrado")

        return {
            "codigo": proceso.codigo,
            "nombre": proceso.nombre,
            "nivel": nivel,
            "mes_corte": mes_corte,
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
    def _avance_corte(session: Session, indicador: FichaIndicador, meses: list[str]) -> dict | None:
        """
        Desempeño en el mes de corte: último mes con dato dentro del periodo.
        Compara el valor obtenido contra el ESPERADO DE ESE MES —el avance T1
        de la directiva— y devuelve avance + semáforo + mes de corte. None si no
        es evaluable (sin mediciones o sin resultado esperado).
        """
        unidad = indicador.unidad or ""
        mediciones = sorted(
            (m for m in session.exec(
                select(Medicion).where(Medicion.indicador_id == indicador.id)
            ).all() if m.mes in meses),
            key=lambda m: orden_mes(m.mes),
        )
        valor = None
        esperado = None
        mes_corte = None
        for m in reversed(mediciones):
            v = derivar_obtenido(m.numerador, m.denominador, unidad, m.resultado_obtenido)
            if v is not None and m.resultado_esperado is not None:
                valor = v
                esperado = m.resultado_esperado
                mes_corte = m.mes
                break
        if valor is None:
            return None

        es_descendente = "descendente" in (indicador.sentido or "").lower()
        avance = ProcesoService.calcular_avance_t1(valor, esperado, es_descendente)
        if avance is None:
            return None
        return {"avance": avance, "semaforo": calcular_semaforo(avance), "mes": mes_corte}

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

from sqlmodel import Session, select

from modules.fichas.application.errores import ErrorNoEncontrado, ErrorValidacion
from modules.fichas.application.proceso_lookup import resolver_proceso
from modules.fichas.infrastructure.models import FichaIndicador, Medicion, Proyeccion
from modules.procesos.application.proceso_service import ProcesoService
from modules.procesos.infrastructure.excel_reader import derivar_obtenido
from shared.meses import ORDEN_MESES, mes_por_orden, orden_mes
from shared.semaforo import calcular_semaforo


class ComparacionService:
    """Comparación diagnóstico (real) vs proyección tras la mejora (Mejora III)."""

    @staticmethod
    def comparacion(session: Session, codigo: str) -> dict:
        proceso = resolver_proceso(session, codigo)
        indicadores = session.exec(
            select(FichaIndicador).where(
                FichaIndicador.proceso_id == proceso.id,
                FichaIndicador.activo == True,  # noqa: E712
            )
        ).all()
        return {
            "codigo": proceso.codigo,
            "proceso": proceso.nombre,
            "indicadores": [ComparacionService._comparar_indicador(session, ind) for ind in indicadores],
        }

    @staticmethod
    def guardar_proyeccion(session: Session, indicador_id: int, datos: dict) -> dict:
        indicador = ComparacionService._resolver_indicador(session, indicador_id)
        proyeccion = session.exec(
            select(Proyeccion).where(Proyeccion.indicador_id == indicador.id)
        ).first()
        if proyeccion is None:
            proyeccion = Proyeccion(indicador_id=indicador.id)

        meses = datos.get("meses")
        if meses is not None:
            proyeccion.meses = ComparacionService._limpiar_meses(meses)
        if "nota" in datos:
            proyeccion.nota = (datos.get("nota") or "").strip() or None
        if "oportunidad_id" in datos:
            proyeccion.oportunidad_id = datos.get("oportunidad_id")

        session.add(proyeccion)
        session.commit()
        session.refresh(proyeccion)
        return ComparacionService._comparar_indicador(session, indicador)

    @staticmethod
    def sugerir_proyeccion(session: Session, indicador_id: int) -> dict:
        """Rampa lineal desde el último valor real hasta la meta, mes a mes hasta diciembre."""
        indicador = ComparacionService._resolver_indicador(session, indicador_id)
        reales = ComparacionService._serie_real(session, indicador)
        if not reales or indicador.meta_final is None:
            raise ErrorValidacion("Se necesita al menos una medición real y una meta para sugerir la proyección")

        ultimo = reales[-1]
        orden_inicio = orden_mes(ultimo["mes"])
        anio = ultimo["anio"]
        pasos = 12 - orden_inicio
        if pasos <= 0:
            return {"meses": []}

        inicio_valor = ultimo["valor"]
        meta = indicador.meta_final
        meses = []
        for i in range(1, pasos + 1):
            valor = inicio_valor + (meta - inicio_valor) * (i / pasos)
            meses.append({"mes": mes_por_orden(orden_inicio + i), "anio": anio, "valor": round(valor, 2)})
        return {"meses": meses}

    # ------------------------------------------------------------------ #
    # Cálculo de la comparación                                          #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _comparar_indicador(session: Session, indicador: FichaIndicador) -> dict:
        sentido = indicador.sentido or "Ascendente"
        es_descendente = "descendente" in sentido.lower()
        meta = indicador.meta_final

        def avance_meta(valor):
            return ProcesoService.calcular_avance_t1(valor, meta, es_descendente) if meta is not None else None

        reales = ComparacionService._serie_real(session, indicador)
        for r in reales:
            r["avance"] = avance_meta(r["valor"])
            r["semaforo"] = calcular_semaforo(r["avance"])

        proyeccion = session.exec(
            select(Proyeccion).where(Proyeccion.indicador_id == indicador.id)
        ).first()
        proyectados = []
        if proyeccion and proyeccion.meses:
            for m in sorted(proyeccion.meses, key=lambda x: orden_mes(x.get("mes", ""))):
                valor = m.get("valor")
                proyectados.append({
                    "mes": m.get("mes"),
                    "anio": m.get("anio"),
                    "valor": valor,
                    "avance": avance_meta(valor),
                    "semaforo": calcular_semaforo(avance_meta(valor)),
                })

        return {
            "id": indicador.id,
            "nombre": indicador.nombre,
            "unidad": indicador.unidad,
            "meta_final": meta,
            "es_descendente": es_descendente,
            "tiene_proyeccion": bool(proyectados),
            "real": reales,
            "proyeccion": proyectados,
            "nota": proyeccion.nota if proyeccion else None,
            "mejora": ComparacionService._mejora(reales, proyectados, meta),
        }

    @staticmethod
    def _mejora(reales: list[dict], proyectados: list[dict], meta) -> dict | None:
        if not reales or not proyectados:
            return None
        ultimo_real = reales[-1]
        ultimo_proy = proyectados[-1]
        av_real = ultimo_real["avance"]
        av_proy = ultimo_proy["avance"]
        if av_real is None or av_proy is None:
            return None

        mes_alcanza = next(
            (p["mes"] for p in proyectados if p["avance"] is not None and p["avance"] >= 100),
            None,
        )
        return {
            "brecha_actual": round(100 - av_real, 2),
            "brecha_proyectada": round(100 - av_proy, 2),
            "mejora_pp": round(av_proy - av_real, 2),
            "semaforo_antes": ultimo_real["semaforo"],
            "semaforo_despues": ultimo_proy["semaforo"],
            "valor_antes": ultimo_real["valor"],
            "valor_despues": ultimo_proy["valor"],
            "mes_alcanza_meta": mes_alcanza,
        }

    @staticmethod
    def _serie_real(session: Session, indicador: FichaIndicador) -> list[dict]:
        unidad = indicador.unidad or ""
        mediciones = session.exec(
            select(Medicion).where(Medicion.indicador_id == indicador.id)
        ).all()
        mediciones = sorted(mediciones, key=lambda m: orden_mes(m.mes))
        serie = []
        for m in mediciones:
            valor = derivar_obtenido(m.numerador, m.denominador, unidad, m.resultado_obtenido)
            if valor is None:
                continue
            serie.append({"mes": m.mes, "anio": m.anio, "valor": valor})
        return serie

    @staticmethod
    def _limpiar_meses(meses: list) -> list[dict]:
        limpio = []
        for m in meses:
            mes = str(m.get("mes", "")).strip().capitalize()
            if mes not in ORDEN_MESES or m.get("valor") is None:
                continue
            limpio.append({"mes": mes, "anio": m.get("anio"), "valor": float(m["valor"])})
        return limpio

    @staticmethod
    def _resolver_indicador(session: Session, indicador_id: int) -> FichaIndicador:
        indicador = session.get(FichaIndicador, indicador_id)
        if indicador is None or not indicador.activo:
            raise ErrorNoEncontrado("El indicador no existe")
        return indicador

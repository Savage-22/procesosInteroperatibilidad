from sqlmodel import Session, select

from modules.fichas.infrastructure.models import FichaIndicador, Medicion, Proceso
from modules.procesos.infrastructure.excel_reader import derivar_obtenido, meta_texto


class LecturaBD:
    """
    Reconstruye la lista de registros canónica (la misma forma que produce el
    Excel) a partir de la BD, para que el dashboard, Pareto, comparativa,
    predicciones y objetivos sigan funcionando sin tocar sus routers.
    """

    @staticmethod
    def hay_datos(session: Session) -> bool:
        return session.exec(select(Medicion.id)).first() is not None

    @staticmethod
    def construir_registros(session: Session) -> list[dict]:
        registros: list[dict] = []
        procesos: dict[int, Proceso] = {}

        indicadores = session.exec(
            select(FichaIndicador).where(FichaIndicador.activo == True)  # noqa: E712
        ).all()

        for ind in indicadores:
            proceso = procesos.get(ind.proceso_id)
            if proceso is None:
                proceso = session.get(Proceso, ind.proceso_id)
                if proceso is not None:
                    procesos[ind.proceso_id] = proceso
            if proceso is None or not proceso.activo:
                continue

            codigo = proceso.codigo
            sentido = ind.sentido or "Ascendente"
            es_descendente = "descendente" in sentido.lower()
            unidad = ind.unidad or ""

            mediciones = session.exec(
                select(Medicion).where(Medicion.indicador_id == ind.id)
            ).all()

            for m in mediciones:
                obtenido = derivar_obtenido(m.numerador, m.denominador, unidad, m.resultado_obtenido)
                esperado = m.resultado_esperado
                diferencia = (
                    round(obtenido - esperado, 2)
                    if obtenido is not None and esperado is not None
                    else None
                )
                registros.append({
                    "codigo_proceso": codigo,
                    "proceso": proceso.nombre,
                    "indicador": ind.nombre,
                    "objetivo_estrategico": ind.objetivo_estrategico or "",
                    "accion_estrategica": ind.accion_estrategica or "",
                    "sentido": sentido,
                    "unidad": unidad,
                    "meta_texto": meta_texto(ind.meta_final, unidad, es_descendente),
                    "meta_final": ind.meta_final,
                    "anio": m.anio,
                    "mes": m.mes,
                    "numerador": m.numerador,
                    "denominador": m.denominador,
                    "resultado_esperado": esperado,
                    "resultado_obtenido": obtenido,
                    "diferencia": diferencia,
                    "modulo": codigo.split(".")[0],
                    "es_descendente": es_descendente,
                    "relevancia": ind.relevancia if ind.relevancia in (1, 2, 3) else 1,
                })

        return registros

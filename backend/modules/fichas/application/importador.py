import os

from sqlmodel import Session, select

from modules.fichas.infrastructure.models import (
    FichaIndicador,
    Medicion,
    Organizacion,
    Proceso,
)

# Nombre de la organización a la que se asocian los datos importados del Excel.
# En un despliegue de una sola entidad basta con una; configurable por si cambia.
ORG_DEFAULT = os.getenv("SEED_ORG_NOMBRE", "Mi organización")


class ImportadorExcel:
    """
    Vuelca los registros parseados del Excel al modelo persistente (issue #51).
    El upsert es idempotente: reimportar el mismo Excel no duplica filas.

    Claves naturales:
      - Proceso     → (organizacion, codigo)
      - Indicador   → (proceso, nombre)
      - Medicion    → (indicador, año, mes)
    """

    @staticmethod
    def _get_or_create_org(session: Session, nombre: str) -> Organizacion:
        org = session.exec(select(Organizacion).where(Organizacion.nombre == nombre)).first()
        if org:
            return org
        org = Organizacion(nombre=nombre)
        session.add(org)
        session.flush()
        return org

    @staticmethod
    def importar(session: Session, registros: list[dict], org_nombre: str | None = None) -> dict:
        org = ImportadorExcel._get_or_create_org(session, org_nombre or ORG_DEFAULT)

        # Cache de procesos de la organización para no consultar por cada fila
        procesos: dict[str, Proceso] = {
            p.codigo: p
            for p in session.exec(select(Proceso).where(Proceso.organizacion_id == org.id)).all()
        }
        resumen = {"procesos": 0, "indicadores": 0, "mediciones": 0, "actualizadas": 0}

        def get_or_create_proceso(codigo: str, nombre: str, nivel: int, padre: str | None) -> Proceso:
            proceso = procesos.get(codigo)
            if proceso:
                if nombre and proceso.nombre != nombre:
                    proceso.nombre = nombre
                    session.add(proceso)
                return proceso
            proceso = Proceso(
                organizacion_id=org.id, codigo=codigo, nombre=nombre or codigo,
                nivel=nivel, codigo_padre=padre,
            )
            session.add(proceso)
            session.flush()
            procesos[codigo] = proceso
            resumen["procesos"] += 1
            return proceso

        for r in registros:
            codigo = r["codigo_proceso"]
            modulo = r["modulo"]

            # Inventario inferido (Anexo 1): el macroproceso M# es el padre de M#.#
            if modulo != codigo:
                get_or_create_proceso(modulo, f"Macroproceso {modulo}", 0, None)
            proceso = get_or_create_proceso(
                codigo, r.get("proceso"), codigo.count("."), modulo if modulo != codigo else None
            )

            nombre_ind = r.get("indicador") or codigo
            campos_ind = {
                "sentido": r.get("sentido") or "Ascendente",
                "unidad": r.get("unidad") or None,
                "meta_final": r.get("meta_final"),
                "relevancia": r.get("relevancia") or 1,
                "objetivo_estrategico": r.get("objetivo_estrategico") or None,
                "accion_estrategica": r.get("accion_estrategica") or None,
            }
            indicador = session.exec(
                select(FichaIndicador).where(
                    FichaIndicador.proceso_id == proceso.id,
                    FichaIndicador.nombre == nombre_ind,
                )
            ).first()
            if indicador:
                for campo, valor in campos_ind.items():
                    setattr(indicador, campo, valor)
                session.add(indicador)
            else:
                indicador = FichaIndicador(proceso_id=proceso.id, nombre=nombre_ind, **campos_ind)
                session.add(indicador)
                session.flush()
                resumen["indicadores"] += 1

            anio, mes = r.get("anio"), r.get("mes")
            campos_med = {
                "numerador": r.get("numerador"),
                "denominador": r.get("denominador"),
                "resultado_esperado": r.get("resultado_esperado"),
                "resultado_obtenido": r.get("resultado_obtenido"),
            }
            medicion = session.exec(
                select(Medicion).where(
                    Medicion.indicador_id == indicador.id,
                    Medicion.anio == anio,
                    Medicion.mes == mes,
                )
            ).first()
            if medicion:
                for campo, valor in campos_med.items():
                    setattr(medicion, campo, valor)
                session.add(medicion)
                resumen["actualizadas"] += 1
            else:
                session.add(Medicion(indicador_id=indicador.id, anio=anio, mes=mes, **campos_med))
                resumen["mediciones"] += 1

        session.commit()
        return resumen

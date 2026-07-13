from sqlmodel import Session, select

from modules.fichas.application.errores import ErrorNoEncontrado, ErrorValidacion
from modules.fichas.application.proceso_lookup import resolver_proceso
from modules.fichas.infrastructure.models import AccionCambio

# Etapas del modelo de gestión del cambio de Kurt Lewin
ETAPAS = ["descongelar", "cambiar", "recongelar"]
ESTADOS_CAMBIO = ["pendiente", "en_curso", "hecho"]

# Ayuda contextual: de qué trata cada etapa y con qué se conecta en la Mejora
ETAPAS_INFO = {
    "descongelar": {
        "titulo": "Descongelar",
        "resumen": "Preparar el cambio: reconocer la necesidad y reducir la resistencia.",
        "detalle": "Comunica por qué hay que cambiar (causas raíz del diagnóstico y brechas del indicador), involucra a los actores y anticipa las resistencias.",
    },
    "cambiar": {
        "titulo": "Cambiar",
        "resumen": "Implementar las mejoras: ejecutar el plan de acción.",
        "detalle": "Pon en marcha las oportunidades priorizadas (F=C×I) con responsable, fecha y seguimiento del estado.",
    },
    "recongelar": {
        "titulo": "Recongelar",
        "resumen": "Consolidar el cambio: estandarizar y sostener los resultados.",
        "detalle": "Estandariza en la ficha y los indicadores, valida con la comparación Antes/Después e institucionaliza (capacitación, documentación, monitoreo).",
    },
}


class CambioService:
    """Gestión del cambio con el modelo de Kurt Lewin (Mejora IV)."""

    @staticmethod
    def listar(session: Session, codigo: str) -> dict:
        proceso = resolver_proceso(session, codigo)
        acciones = session.exec(
            select(AccionCambio).where(
                AccionCambio.proceso_id == proceso.id,
                AccionCambio.activo == True,  # noqa: E712
            )
        ).all()

        por_etapa = {e: [] for e in ETAPAS}
        for a in acciones:
            por_etapa.setdefault(a.etapa, []).append(CambioService._serializar(a))
        for etapa in por_etapa:
            por_etapa[etapa].sort(key=lambda x: (x["orden"], x["id"]))

        total = len(acciones)
        hechas = sum(1 for a in acciones if a.estado == "hecho")
        return {
            "etapas": ETAPAS,
            "info": ETAPAS_INFO,
            "estados": ESTADOS_CAMBIO,
            "acciones": por_etapa,
            "progreso": {
                "total": total,
                "hechas": hechas,
                "porcentaje": round(hechas / total * 100, 1) if total else 0.0,
            },
        }

    @staticmethod
    def crear(session: Session, codigo: str, datos: dict) -> dict:
        proceso = resolver_proceso(session, codigo)
        etapa = (datos.get("etapa") or "").strip().lower()
        descripcion = (datos.get("descripcion") or "").strip()
        if etapa not in ETAPAS:
            raise ErrorValidacion(f"Etapa inválida. Usa una de: {', '.join(ETAPAS)}")
        if not descripcion:
            raise ErrorValidacion("La descripción de la acción es obligatoria")

        estado = (datos.get("estado") or "pendiente").strip().lower()
        if estado not in ESTADOS_CAMBIO:
            raise ErrorValidacion("Estado inválido")

        accion = AccionCambio(
            proceso_id=proceso.id,
            etapa=etapa,
            descripcion=descripcion,
            responsable=(datos.get("responsable") or None),
            fecha=(datos.get("fecha") or None),
            estado=estado,
            orden=int(datos.get("orden") or 0),
        )
        session.add(accion)
        session.commit()
        session.refresh(accion)
        return CambioService._serializar(accion)

    @staticmethod
    def actualizar(session: Session, accion_id: int, datos: dict) -> dict:
        accion = CambioService._resolver(session, accion_id)
        if "etapa" in datos:
            etapa = (datos.get("etapa") or "").strip().lower()
            if etapa not in ETAPAS:
                raise ErrorValidacion("Etapa inválida")
            accion.etapa = etapa
        if "descripcion" in datos:
            descripcion = (datos.get("descripcion") or "").strip()
            if not descripcion:
                raise ErrorValidacion("La descripción de la acción es obligatoria")
            accion.descripcion = descripcion
        if "responsable" in datos:
            accion.responsable = datos.get("responsable") or None
        if "fecha" in datos:
            accion.fecha = datos.get("fecha") or None
        if "estado" in datos:
            estado = (datos.get("estado") or "").strip().lower()
            if estado not in ESTADOS_CAMBIO:
                raise ErrorValidacion("Estado inválido")
            accion.estado = estado
        if "orden" in datos:
            accion.orden = int(datos.get("orden") or 0)
        session.add(accion)
        session.commit()
        session.refresh(accion)
        return CambioService._serializar(accion)

    @staticmethod
    def eliminar(session: Session, accion_id: int) -> None:
        accion = CambioService._resolver(session, accion_id)
        accion.activo = False
        session.add(accion)
        session.commit()

    # ------------------------------------------------------------------ #
    # Helpers                                                            #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _resolver(session: Session, accion_id: int) -> AccionCambio:
        accion = session.get(AccionCambio, accion_id)
        if accion is None or not accion.activo:
            raise ErrorNoEncontrado("La acción de cambio no existe")
        return accion

    @staticmethod
    def _serializar(accion: AccionCambio) -> dict:
        return {
            "id": accion.id,
            "etapa": accion.etapa,
            "descripcion": accion.descripcion,
            "responsable": accion.responsable,
            "fecha": accion.fecha,
            "estado": accion.estado,
            "orden": accion.orden,
        }

from sqlmodel import Session, select

from modules.fichas.application.errores import ErrorNoEncontrado, ErrorValidacion
from modules.fichas.application.proceso_lookup import resolver_proceso
from modules.fichas.infrastructure.models import Oportunidad

ESTRATEGIAS = ["evitar", "mitigar", "transferir", "aceptar"]
ESTADOS = ["propuesta", "en_curso", "implementada", "descartada"]


def _en_rango(valor, defecto=1) -> int:
    try:
        v = int(valor)
    except (TypeError, ValueError):
        return defecto
    return min(5, max(1, v))


def clasificar_factibilidad(factibilidad: int) -> str:
    """Rangos de la ficha de mejora: F=C×I decide el plazo de la acción."""
    if factibilidad <= 7:
        return "Inmediato"
    if factibilidad <= 14:
        return "Corto plazo"
    return "Analizar"


def nivel_riesgo(riesgo: int) -> str:
    """Matriz cualitativa probabilidad × consecuencia."""
    if riesgo <= 4:
        return "Bajo"
    if riesgo <= 9:
        return "Medio"
    if riesgo <= 14:
        return "Alto"
    return "Extremo"


class OportunidadService:
    """Gestión de oportunidades de mejora y priorización por F = C × I (Mejora II)."""

    @staticmethod
    def listar(session: Session, codigo: str) -> list[dict]:
        proceso = resolver_proceso(session, codigo)
        oportunidades = session.exec(
            select(Oportunidad).where(
                Oportunidad.proceso_id == proceso.id,
                Oportunidad.activo == True,  # noqa: E712
            )
        ).all()
        serializadas = [OportunidadService._serializar(o) for o in oportunidades]
        # Prioriza: menor F = acción más inmediata primero; a igual F, mayor riesgo antes
        serializadas.sort(key=lambda o: (o["factibilidad"], -o["riesgo"]))
        return serializadas

    @staticmethod
    def crear(session: Session, codigo: str, datos: dict) -> dict:
        proceso = resolver_proceso(session, codigo)
        descripcion = (datos.get("descripcion") or "").strip()
        if not descripcion:
            raise ErrorValidacion("La descripción de la oportunidad es obligatoria")

        oportunidad = Oportunidad(proceso_id=proceso.id, descripcion=descripcion)
        OportunidadService._aplicar(oportunidad, datos)
        session.add(oportunidad)
        session.commit()
        session.refresh(oportunidad)
        return OportunidadService._serializar(oportunidad)

    @staticmethod
    def actualizar(session: Session, oportunidad_id: int, datos: dict) -> dict:
        oportunidad = OportunidadService._resolver(session, oportunidad_id)
        if "descripcion" in datos and not (datos.get("descripcion") or "").strip():
            raise ErrorValidacion("La descripción de la oportunidad es obligatoria")
        OportunidadService._aplicar(oportunidad, datos)
        session.add(oportunidad)
        session.commit()
        session.refresh(oportunidad)
        return OportunidadService._serializar(oportunidad)

    @staticmethod
    def eliminar(session: Session, oportunidad_id: int) -> None:
        oportunidad = OportunidadService._resolver(session, oportunidad_id)
        oportunidad.activo = False
        session.add(oportunidad)
        session.commit()

    # ------------------------------------------------------------------ #
    # Helpers                                                            #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _aplicar(oportunidad: Oportunidad, datos: dict) -> None:
        for campo in ("descripcion", "accion_propuesta", "tipo", "estrategia"):
            if campo in datos:
                valor = datos.get(campo)
                setattr(oportunidad, campo, (valor or "").strip() or None if isinstance(valor, str) else valor)
        for campo in ("costo", "impacto", "probabilidad", "consecuencia"):
            if campo in datos:
                setattr(oportunidad, campo, _en_rango(datos.get(campo)))
        if "causa_id" in datos:
            oportunidad.causa_id = datos.get("causa_id")
        if "estado" in datos and datos.get("estado") in ESTADOS:
            oportunidad.estado = datos["estado"]

    @staticmethod
    def _resolver(session: Session, oportunidad_id: int) -> Oportunidad:
        oportunidad = session.get(Oportunidad, oportunidad_id)
        if oportunidad is None or not oportunidad.activo:
            raise ErrorNoEncontrado("La oportunidad no existe")
        return oportunidad

    @staticmethod
    def _serializar(o: Oportunidad) -> dict:
        factibilidad = o.costo * o.impacto
        riesgo = o.probabilidad * o.consecuencia
        return {
            "id": o.id,
            "proceso_id": o.proceso_id,
            "causa_id": o.causa_id,
            "tipo": o.tipo,
            "descripcion": o.descripcion,
            "accion_propuesta": o.accion_propuesta,
            "costo": o.costo,
            "impacto": o.impacto,
            "probabilidad": o.probabilidad,
            "consecuencia": o.consecuencia,
            "factibilidad": factibilidad,
            "plazo": clasificar_factibilidad(factibilidad),
            "riesgo": riesgo,
            "nivel_riesgo": nivel_riesgo(riesgo),
            "estrategia": o.estrategia,
            "estado": o.estado,
        }

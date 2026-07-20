import re
from datetime import datetime, timezone

from sqlmodel import Session, select

from modules.fichas.application.errores import ErrorNoEncontrado, ErrorValidacion
from modules.fichas.application.organizacion_service import OrganizacionService
from modules.fichas.infrastructure.models import Investigacion, Proceso
from modules.procesos.infrastructure.excel_reader import MODULOS_ESPERADOS

TIPOS = ["tesis", "artículo", "libro", "informe", "norma"]

_PATRON_MACROPROCESO = re.compile(r"^M\d+$")

# Rango razonable para una referencia académica; fuera de él casi siempre es un
# error de tipeo (2O25, 20255) que conviene rechazar en vez de guardar.
_ANIO_MIN, _ANIO_MAX = 1900, 2100


class InvestigacionService:
    """
    Investigaciones que sustentan cada macroproceso.

    La metodología del proyecto exige respaldar los macroprocesos con
    referencias reales: aquí se registran, se agrupan por módulo y viajan en el
    Excel como una hoja más.
    """

    @staticmethod
    def listar(session: Session, macroproceso: str | None = None) -> dict:
        org = OrganizacionService.actual(session)
        consulta = select(Investigacion).where(
            Investigacion.organizacion_id == org.id,
            Investigacion.activo == True,  # noqa: E712
        )
        if macroproceso:
            consulta = consulta.where(
                Investigacion.macroproceso == _normalizar_macroproceso(macroproceso)
            )
        investigaciones = session.exec(consulta).all()

        macroprocesos = InvestigacionService._macroprocesos(session, org.id, investigaciones)
        por_macroproceso = {m: [] for m in macroprocesos}
        for inv in investigaciones:
            por_macroproceso.setdefault(inv.macroproceso, []).append(
                InvestigacionService._serializar(inv)
            )
        for lista in por_macroproceso.values():
            lista.sort(key=lambda i: (-(i["anio"] or 0), i["titulo"]))

        return {
            "macroprocesos": sorted(por_macroproceso),
            "tipos": TIPOS,
            "investigaciones": por_macroproceso,
            "total": len(investigaciones),
            # Los que todavía no tienen sustento: es el pendiente que la vista destaca
            "sin_sustento": sorted(m for m, l in por_macroproceso.items() if not l),
        }

    @staticmethod
    def crear(session: Session, datos: dict) -> dict:
        org = OrganizacionService.actual(session)
        investigacion = Investigacion(
            organizacion_id=org.id,
            macroproceso=_macroproceso_valido(datos.get("macroproceso")),
            titulo=_titulo_valido(datos.get("titulo")),
        )
        InvestigacionService._aplicar_opcionales(investigacion, datos)
        session.add(investigacion)
        session.commit()
        session.refresh(investigacion)
        return InvestigacionService._serializar(investigacion)

    @staticmethod
    def actualizar(session: Session, investigacion_id: int, datos: dict) -> dict:
        investigacion = InvestigacionService._resolver(session, investigacion_id)
        if "macroproceso" in datos:
            investigacion.macroproceso = _macroproceso_valido(datos.get("macroproceso"))
        if "titulo" in datos:
            investigacion.titulo = _titulo_valido(datos.get("titulo"))
        InvestigacionService._aplicar_opcionales(investigacion, datos)
        investigacion.actualizado_en = datetime.now(timezone.utc)
        session.add(investigacion)
        session.commit()
        session.refresh(investigacion)
        return InvestigacionService._serializar(investigacion)

    @staticmethod
    def eliminar(session: Session, investigacion_id: int) -> None:
        investigacion = InvestigacionService._resolver(session, investigacion_id)
        investigacion.activo = False
        session.add(investigacion)
        session.commit()

    # ------------------------------------------------------------------ #
    # Helpers                                                            #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _macroprocesos(
        session: Session, organizacion_id: int, investigaciones: list[Investigacion]
    ) -> set[str]:
        """
        Los módulos esperados, más los que el inventario o las propias
        investigaciones hayan traído: una entidad que agregó M5 debe verlo.
        """
        codigos = session.exec(
            select(Proceso.codigo).where(
                Proceso.organizacion_id == organizacion_id,
                Proceso.activo == True,  # noqa: E712
            )
        ).all()
        del_inventario = {c.split(".")[0].upper() for c in codigos}
        return (
            set(MODULOS_ESPERADOS)
            | {m for m in del_inventario if _PATRON_MACROPROCESO.match(m)}
            | {i.macroproceso for i in investigaciones}
        )

    @staticmethod
    def _aplicar_opcionales(investigacion: Investigacion, datos: dict) -> None:
        for campo in ("autores", "institucion", "aporte"):
            if campo in datos:
                setattr(investigacion, campo, (datos.get(campo) or "").strip() or None)
        if "tipo" in datos:
            investigacion.tipo = _tipo_valido(datos.get("tipo"))
        if "url" in datos:
            investigacion.url = _url_valida(datos.get("url"))
        if "anio" in datos:
            investigacion.anio = _anio_valido(datos.get("anio"))

    @staticmethod
    def _resolver(session: Session, investigacion_id: int) -> Investigacion:
        investigacion = session.get(Investigacion, investigacion_id)
        if investigacion is None or not investigacion.activo:
            raise ErrorNoEncontrado("La investigación no existe")
        return investigacion

    @staticmethod
    def _serializar(investigacion: Investigacion) -> dict:
        return {
            "id": investigacion.id,
            "macroproceso": investigacion.macroproceso,
            "titulo": investigacion.titulo,
            "autores": investigacion.autores,
            "anio": investigacion.anio,
            "tipo": investigacion.tipo,
            "institucion": investigacion.institucion,
            "url": investigacion.url,
            "aporte": investigacion.aporte,
        }


# --------------------------------------------------------------------------- #
# Validación de campos                                                        #
# --------------------------------------------------------------------------- #

def _normalizar_macroproceso(valor) -> str:
    """Acepta 'M1' o cualquier código del módulo ('m1.2') y devuelve 'M1'."""
    return (valor or "").strip().upper().split(".")[0]


def _macroproceso_valido(valor) -> str:
    macroproceso = _normalizar_macroproceso(valor)
    if not _PATRON_MACROPROCESO.match(macroproceso):
        raise ErrorValidacion("El macroproceso debe seguir el patrón M<número>. Ej: M1")
    return macroproceso


def _titulo_valido(valor) -> str:
    titulo = (valor or "").strip()
    if not titulo:
        raise ErrorValidacion("El título de la investigación es obligatorio")
    return titulo


def _tipo_valido(valor) -> str | None:
    tipo = (valor or "").strip().lower()
    if not tipo:
        return None
    if tipo not in TIPOS:
        raise ErrorValidacion(f"Tipo inválido. Usa uno de: {', '.join(TIPOS)}")
    return tipo


def _url_valida(valor) -> str | None:
    url = (valor or "").strip()
    if not url:
        return None
    if not url.startswith(("http://", "https://")):
        raise ErrorValidacion("El enlace debe empezar con http:// o https://")
    return url


def _anio_valido(valor) -> int | None:
    if valor in (None, ""):
        return None
    try:
        anio = int(valor)
    except (TypeError, ValueError):
        raise ErrorValidacion("El año debe ser un número")
    if not _ANIO_MIN <= anio <= _ANIO_MAX:
        raise ErrorValidacion(f"El año debe estar entre {_ANIO_MIN} y {_ANIO_MAX}")
    return anio

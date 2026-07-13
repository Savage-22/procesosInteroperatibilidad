from sqlmodel import Session, select

from modules.fichas.application.errores import ErrorNoEncontrado
from modules.fichas.application.organizacion_service import OrganizacionService
from modules.fichas.infrastructure.models import Proceso


def resolver_proceso(session: Session, codigo: str) -> Proceso:
    """Devuelve el proceso activo de la organización actual o lanza ErrorNoEncontrado."""
    org = OrganizacionService.actual(session)
    proceso = session.exec(
        select(Proceso).where(
            Proceso.organizacion_id == org.id,
            Proceso.codigo == codigo.strip().upper(),
            Proceso.activo == True,  # noqa: E712
        )
    ).first()
    if proceso is None:
        raise ErrorNoEncontrado(f"El proceso '{codigo}' no existe")
    return proceso

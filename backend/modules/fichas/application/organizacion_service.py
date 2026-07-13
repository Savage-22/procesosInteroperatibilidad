from sqlmodel import Session, select

from modules.fichas.application.importador import ORG_DEFAULT
from modules.fichas.infrastructure.models import Organizacion


class OrganizacionService:
    """
    Resuelve la organización "actual". El despliegue es de una sola entidad por
    instancia, así que se trabaja con la primera organización activa y se crea
    una por defecto si aún no existe.
    """

    @staticmethod
    def actual(session: Session) -> Organizacion:
        org = session.exec(
            select(Organizacion).where(Organizacion.activo == True)  # noqa: E712
        ).first()
        if org:
            return org
        org = Organizacion(nombre=ORG_DEFAULT)
        session.add(org)
        session.commit()
        session.refresh(org)
        return org

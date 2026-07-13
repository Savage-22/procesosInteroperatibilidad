from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session

from modules.fichas.application.organizacion_service import OrganizacionService
from modules.fichas.infrastructure.database import get_session

router = APIRouter(prefix="/api/organizacion", tags=["organizacion"])


class OrganizacionEntrada(BaseModel):
    nombre: str | None = None
    sector: str | None = None
    estado_onboarding: str | None = None


@router.get("")
def obtener_organizacion(session: Session = Depends(get_session)):
    return {"success": True, "data": OrganizacionService.resumen(session)}


@router.put("")
def actualizar_organizacion(datos: OrganizacionEntrada, session: Session = Depends(get_session)):
    OrganizacionService.actualizar(session, datos.model_dump(exclude_unset=True))
    return {"success": True, "message": "Organización actualizada", "data": OrganizacionService.resumen(session)}

from fastapi import APIRouter, Depends
from sqlmodel import Session

from modules.bitacora.application.bitacora_service import BitacoraService
from modules.fichas.infrastructure.database import get_session

router = APIRouter(prefix="/api", tags=["bitacora"])


@router.get("/bitacora")
def bitacora(session: Session = Depends(get_session)):
    """Fases del trabajo realizado, con la evidencia registrada en el sistema."""
    return {"success": True, "data": BitacoraService.obtener(session)}

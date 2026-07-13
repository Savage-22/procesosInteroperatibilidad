from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from modules.fichas.application.errores import ErrorNoEncontrado
from modules.fichas.application.ficha_proceso_service import FichaProcesoService
from modules.fichas.infrastructure.database import get_session

router = APIRouter(prefix="/api/procesos", tags=["ficha-proceso"])


class FichaProcesoEntrada(BaseModel):
    tipo: str | None = None
    dueno: str | None = None
    objetivo: str | None = None
    objetivo_estrategico: str | None = None
    proveedores: list[str] = []
    entradas: list[str] = []
    salidas: list[str] = []
    receptores: list[str] = []
    actividades: list[str] = []
    riesgos: list[str] = []
    registros: list[str] = []
    elaborado_por: str | None = None
    revisado_por: str | None = None
    aprobado_por: str | None = None


@router.get("/{codigo}/ficha")
def obtener_ficha(codigo: str, session: Session = Depends(get_session)):
    try:
        data = FichaProcesoService.obtener(session, codigo)
    except ErrorNoEncontrado as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"success": True, "data": data}


@router.put("/{codigo}/ficha")
def guardar_ficha(codigo: str, datos: FichaProcesoEntrada, session: Session = Depends(get_session)):
    try:
        data = FichaProcesoService.guardar(session, codigo, datos.model_dump())
    except ErrorNoEncontrado as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"success": True, "message": "Ficha guardada", "data": data}

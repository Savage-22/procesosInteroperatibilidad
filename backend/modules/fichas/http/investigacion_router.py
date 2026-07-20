from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from modules.fichas.application.errores import ErrorNoEncontrado, ErrorValidacion
from modules.fichas.application.investigacion_service import InvestigacionService
from modules.fichas.infrastructure.database import get_session

router = APIRouter(prefix="/api", tags=["investigaciones"])


def _manejar(fn):
    try:
        return fn()
    except ErrorNoEncontrado as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ErrorValidacion as e:
        raise HTTPException(status_code=400, detail=str(e))


class InvestigacionEntrada(BaseModel):
    macroproceso: str | None = None
    titulo: str | None = None
    autores: str | None = None
    anio: int | None = None
    tipo: str | None = None
    institucion: str | None = None
    url: str | None = None
    aporte: str | None = None


@router.get("/investigaciones")
def listar_investigaciones(macroproceso: str | None = None, session: Session = Depends(get_session)):
    """Investigaciones que sustentan cada macroproceso, agrupadas por módulo."""
    data = _manejar(lambda: InvestigacionService.listar(session, macroproceso))
    return {"success": True, "data": data}


@router.post("/investigaciones")
def crear_investigacion(datos: InvestigacionEntrada, session: Session = Depends(get_session)):
    data = _manejar(lambda: InvestigacionService.crear(session, datos.model_dump(exclude_unset=True)))
    return {"success": True, "message": "Investigación registrada", "data": data}


@router.put("/investigaciones/{investigacion_id}")
def actualizar_investigacion(
    investigacion_id: int, datos: InvestigacionEntrada, session: Session = Depends(get_session)
):
    data = _manejar(
        lambda: InvestigacionService.actualizar(
            session, investigacion_id, datos.model_dump(exclude_unset=True)
        )
    )
    return {"success": True, "message": "Investigación actualizada", "data": data}


@router.delete("/investigaciones/{investigacion_id}")
def eliminar_investigacion(investigacion_id: int, session: Session = Depends(get_session)):
    _manejar(lambda: InvestigacionService.eliminar(session, investigacion_id))
    return {"success": True, "message": "Investigación eliminada"}

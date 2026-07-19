from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from modules.anexos.application.anexos_service import AnexosService
from modules.fichas.application.errores import ErrorNoEncontrado, ErrorValidacion
from modules.fichas.infrastructure.database import get_session

router = APIRouter(prefix="/api/anexos", tags=["anexos"])


def _manejar(fn):
    try:
        return {"success": True, "data": fn()}
    except ErrorNoEncontrado as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ErrorValidacion as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("")
def indice(session: Session = Depends(get_session)):
    """Anexos emitibles y su grado de completitud."""
    return _manejar(lambda: AnexosService.indice(session))


@router.get("/1")
def anexo_1(session: Session = Depends(get_session)):
    return _manejar(lambda: AnexosService.anexo1(session))


@router.get("/2/{codigo}")
def anexo_2(codigo: str, session: Session = Depends(get_session)):
    return _manejar(lambda: AnexosService.anexo2(session, codigo))


@router.get("/4/{codigo}")
def anexo_4(codigo: str, session: Session = Depends(get_session)):
    return _manejar(lambda: AnexosService.anexo4(session, codigo))

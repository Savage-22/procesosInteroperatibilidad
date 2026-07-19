from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from modules.fichas.application.errores import ErrorNoEncontrado, ErrorValidacion
from modules.fichas.infrastructure.database import get_session
from modules.tablero.application.resultados_service import ResultadosService
from modules.tablero.application.tablero_service import TableroService

router = APIRouter(prefix="/api", tags=["tablero"])


def _manejar(fn):
    try:
        return {"success": True, "data": fn()}
    except ErrorNoEncontrado as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ErrorValidacion as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tablero")
def tablero(periodo: str | None = None, session: Session = Depends(get_session)):
    """Monitoreo indicador por indicador: estado vs meta, tendencia y alertas."""
    return _manejar(lambda: TableroService.monitoreo(session, periodo))


@router.get("/resultados")
def resultados(session: Session = Depends(get_session)):
    """Resultados de los indicadores y efecto de las mejoras aplicadas."""
    return _manejar(lambda: ResultadosService.consolidado(session))

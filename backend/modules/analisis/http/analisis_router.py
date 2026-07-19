from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from modules.analisis.application.analisis_service import AnalisisService
from modules.fichas.application.errores import ErrorNoEncontrado, ErrorValidacion
from modules.fichas.infrastructure.database import get_session
from shared.ia import ErrorIA, IANoConfigurada

router = APIRouter(prefix="/api/analisis", tags=["analisis"])


def _manejar(fn):
    try:
        return {"success": True, "data": fn()}
    except IANoConfigurada as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ErrorIA as e:
        raise HTTPException(status_code=502, detail=str(e))
    except ErrorNoEncontrado as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ErrorValidacion as e:
        raise HTTPException(status_code=400, detail=str(e))


class AnalisisEntrada(BaseModel):
    codigo: str | None = None
    periodo: str | None = None


class PreguntaEntrada(BaseModel):
    pregunta: str
    seccion: str | None = None
    codigo: str | None = None


@router.get("/estado")
def estado():
    """Si la IA está configurada, para que la interfaz oculte los botones si no lo está."""
    return {"success": True, "data": AnalisisService.estado()}


@router.post("/seccion/{seccion}")
def analizar_seccion(
    seccion: str,
    datos: AnalisisEntrada | None = None,
    session: Session = Depends(get_session),
):
    """Diagnóstico y recomendaciones sobre una sección concreta del sistema."""
    entrada = datos or AnalisisEntrada()
    return _manejar(
        lambda: AnalisisService.por_seccion(session, seccion, entrada.codigo, entrada.periodo)
    )


@router.get("/informe")
def informe(periodo: str | None = None, session: Session = Depends(get_session)):
    """Informe ejecutivo global del estado institucional."""
    return _manejar(lambda: AnalisisService.informe(session, periodo))


@router.post("/sugerir/indicadores/{codigo}")
def sugerir_indicadores(codigo: str, session: Session = Depends(get_session)):
    return _manejar(lambda: AnalisisService.sugerir_indicadores(session, codigo))


@router.post("/sugerir/sipoc/{codigo}")
def sugerir_sipoc(codigo: str, session: Session = Depends(get_session)):
    return _manejar(lambda: AnalisisService.sugerir_sipoc(session, codigo))


@router.post("/sugerir/causas/{codigo}")
def sugerir_causas(codigo: str, session: Session = Depends(get_session)):
    return _manejar(lambda: AnalisisService.sugerir_causas(session, codigo))


class MejoraPropuesta(BaseModel):
    causas: list[dict] = []
    oportunidades: list[dict] = []
    cambio: list[dict] = []
    proyeccion: dict | None = None


@router.post("/mejora/{codigo}")
def completar_mejora(codigo: str, session: Session = Depends(get_session)):
    """Propone las 4 partes de la mejora (Ishikawa, oportunidades, Antes/Después, Lewin)."""
    return _manejar(lambda: AnalisisService.completar_mejora(session, codigo))


@router.post("/mejora/{codigo}/aplicar")
def aplicar_mejora(
    codigo: str,
    propuesta: MejoraPropuesta,
    session: Session = Depends(get_session),
):
    """Persiste la propuesta de mejora ya revisada por el usuario."""
    return _manejar(lambda: AnalisisService.aplicar_mejora(session, codigo, propuesta.model_dump()))


@router.post("/explicar")
def explicar(datos: PreguntaEntrada, session: Session = Depends(get_session)):
    return _manejar(
        lambda: {
            "respuesta": AnalisisService.explicar(
                session, datos.pregunta, datos.seccion, datos.codigo
            )
        }
    )

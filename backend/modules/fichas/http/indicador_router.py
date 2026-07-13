from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from modules.fichas.application.errores import ErrorNoEncontrado, ErrorValidacion
from modules.fichas.application.indicador_service import IndicadorService
from modules.fichas.application.sincronizador import Sincronizador
from modules.fichas.infrastructure.database import get_session

router = APIRouter(prefix="/api", tags=["indicadores"])


class IndicadorEntrada(BaseModel):
    nombre: str | None = None
    tipo: str | None = None
    sentido: str | None = None
    unidad: str | None = None
    meta_final: float | None = None
    linea_base: float | None = None
    formula: str | None = None
    fuente: str | None = None
    responsable: str | None = None
    relevancia: int | None = None
    objetivo_estrategico: str | None = None
    accion_estrategica: str | None = None


class MedicionEntrada(BaseModel):
    anio: int | None = None
    mes: str
    numerador: float | None = None
    denominador: float | None = None
    resultado_esperado: float | None = None
    resultado_obtenido: float | None = None


def _manejar(fn):
    try:
        return fn()
    except ErrorNoEncontrado as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ErrorValidacion as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/procesos/{codigo}/indicadores")
def listar_indicadores(codigo: str, session: Session = Depends(get_session)):
    data = _manejar(lambda: IndicadorService.listar(session, codigo))
    return {"success": True, "data": data}


@router.post("/procesos/{codigo}/indicadores")
def crear_indicador(codigo: str, datos: IndicadorEntrada, session: Session = Depends(get_session)):
    data = _manejar(lambda: IndicadorService.crear(session, codigo, datos.model_dump(exclude_unset=True)))
    Sincronizador.rehidratar()
    return {"success": True, "message": "Indicador creado", "data": data}


@router.put("/indicadores/{indicador_id}")
def actualizar_indicador(indicador_id: int, datos: IndicadorEntrada, session: Session = Depends(get_session)):
    data = _manejar(lambda: IndicadorService.actualizar(session, indicador_id, datos.model_dump(exclude_unset=True)))
    Sincronizador.rehidratar()
    return {"success": True, "message": "Indicador actualizado", "data": data}


@router.delete("/indicadores/{indicador_id}")
def eliminar_indicador(indicador_id: int, session: Session = Depends(get_session)):
    _manejar(lambda: IndicadorService.eliminar(session, indicador_id))
    Sincronizador.rehidratar()
    return {"success": True, "message": "Indicador eliminado"}


@router.post("/indicadores/{indicador_id}/mediciones")
def guardar_medicion(indicador_id: int, datos: MedicionEntrada, session: Session = Depends(get_session)):
    data = _manejar(lambda: IndicadorService.guardar_medicion(session, indicador_id, datos.model_dump()))
    Sincronizador.rehidratar()
    return {"success": True, "message": "Medición guardada", "data": data}


@router.delete("/mediciones/{medicion_id}")
def eliminar_medicion(medicion_id: int, session: Session = Depends(get_session)):
    _manejar(lambda: IndicadorService.eliminar_medicion(session, medicion_id))
    Sincronizador.rehidratar()
    return {"success": True, "message": "Medición eliminada"}

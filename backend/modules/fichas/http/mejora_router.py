from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from modules.fichas.application.cambio_service import (
    ESTADOS_CAMBIO,
    ETAPAS,
    CambioService,
)
from modules.fichas.application.causa_service import CATEGORIAS_6M, CausaService
from modules.fichas.application.comparacion_service import ComparacionService
from modules.fichas.application.errores import ErrorNoEncontrado, ErrorValidacion
from modules.fichas.application.oportunidad_service import (
    ESTADOS,
    ESTRATEGIAS,
    OportunidadService,
)
from modules.fichas.infrastructure.database import get_session

router = APIRouter(prefix="/api", tags=["mejora"])


def _manejar(fn):
    try:
        return fn()
    except ErrorNoEncontrado as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ErrorValidacion as e:
        raise HTTPException(status_code=400, detail=str(e))


# ------------------------------------------------------------------ #
# Mejora I — Causas (Ishikawa 6M + Pareto)                           #
# ------------------------------------------------------------------ #

class CausaEntrada(BaseModel):
    categoria: str | None = None
    descripcion: str | None = None
    es_raiz: bool | None = None
    peso: float | None = None


@router.get("/mejora/categorias")
def categorias_6m():
    return {
        "success": True,
        "data": {
            "categorias": CATEGORIAS_6M,
            "estrategias": ESTRATEGIAS,
            "estados": ESTADOS,
            "etapas_cambio": ETAPAS,
            "estados_cambio": ESTADOS_CAMBIO,
        },
    }


@router.get("/procesos/{codigo}/causas")
def listar_causas(codigo: str, session: Session = Depends(get_session)):
    return {"success": True, "data": _manejar(lambda: CausaService.listar(session, codigo))}


@router.post("/procesos/{codigo}/causas")
def crear_causa(codigo: str, datos: CausaEntrada, session: Session = Depends(get_session)):
    data = _manejar(lambda: CausaService.crear(session, codigo, datos.model_dump(exclude_unset=True)))
    return {"success": True, "message": "Causa registrada", "data": data}


@router.put("/causas/{causa_id}")
def actualizar_causa(causa_id: int, datos: CausaEntrada, session: Session = Depends(get_session)):
    data = _manejar(lambda: CausaService.actualizar(session, causa_id, datos.model_dump(exclude_unset=True)))
    return {"success": True, "message": "Causa actualizada", "data": data}


@router.delete("/causas/{causa_id}")
def eliminar_causa(causa_id: int, session: Session = Depends(get_session)):
    _manejar(lambda: CausaService.eliminar(session, causa_id))
    return {"success": True, "message": "Causa eliminada"}


# ------------------------------------------------------------------ #
# Mejora II — Oportunidades (F = C × I)                              #
# ------------------------------------------------------------------ #

class OportunidadEntrada(BaseModel):
    tipo: str | None = None
    descripcion: str | None = None
    accion_propuesta: str | None = None
    costo: int | None = None
    impacto: int | None = None
    probabilidad: int | None = None
    consecuencia: int | None = None
    estrategia: str | None = None
    estado: str | None = None
    causa_id: int | None = None


@router.get("/procesos/{codigo}/oportunidades")
def listar_oportunidades(codigo: str, session: Session = Depends(get_session)):
    return {"success": True, "data": _manejar(lambda: OportunidadService.listar(session, codigo))}


@router.post("/procesos/{codigo}/oportunidades")
def crear_oportunidad(codigo: str, datos: OportunidadEntrada, session: Session = Depends(get_session)):
    data = _manejar(lambda: OportunidadService.crear(session, codigo, datos.model_dump(exclude_unset=True)))
    return {"success": True, "message": "Oportunidad registrada", "data": data}


@router.put("/oportunidades/{oportunidad_id}")
def actualizar_oportunidad(oportunidad_id: int, datos: OportunidadEntrada, session: Session = Depends(get_session)):
    data = _manejar(lambda: OportunidadService.actualizar(session, oportunidad_id, datos.model_dump(exclude_unset=True)))
    return {"success": True, "message": "Oportunidad actualizada", "data": data}


@router.delete("/oportunidades/{oportunidad_id}")
def eliminar_oportunidad(oportunidad_id: int, session: Session = Depends(get_session)):
    _manejar(lambda: OportunidadService.eliminar(session, oportunidad_id))
    return {"success": True, "message": "Oportunidad eliminada"}


# ------------------------------------------------------------------ #
# Mejora III — Comparación Antes/Después                             #
# ------------------------------------------------------------------ #

class MesProyeccion(BaseModel):
    mes: str
    anio: int | None = None
    valor: float


class ProyeccionEntrada(BaseModel):
    meses: list[MesProyeccion] | None = None
    nota: str | None = None
    oportunidad_id: int | None = None


@router.get("/procesos/{codigo}/comparacion")
def comparacion(codigo: str, session: Session = Depends(get_session)):
    return {"success": True, "data": _manejar(lambda: ComparacionService.comparacion(session, codigo))}


@router.put("/indicadores/{indicador_id}/proyeccion")
def guardar_proyeccion(indicador_id: int, datos: ProyeccionEntrada, session: Session = Depends(get_session)):
    payload = datos.model_dump(exclude_unset=True)
    if "meses" in payload and payload["meses"] is not None:
        payload["meses"] = [m.model_dump() for m in datos.meses]
    data = _manejar(lambda: ComparacionService.guardar_proyeccion(session, indicador_id, payload))
    return {"success": True, "message": "Proyección guardada", "data": data}


@router.get("/indicadores/{indicador_id}/proyeccion/sugerir")
def sugerir_proyeccion(indicador_id: int, session: Session = Depends(get_session)):
    return {"success": True, "data": _manejar(lambda: ComparacionService.sugerir_proyeccion(session, indicador_id))}


# ------------------------------------------------------------------ #
# Mejora IV — Gestión del cambio (modelo de Kurt Lewin)              #
# ------------------------------------------------------------------ #

class AccionCambioEntrada(BaseModel):
    etapa: str | None = None
    descripcion: str | None = None
    responsable: str | None = None
    fecha: str | None = None
    estado: str | None = None
    orden: int | None = None


@router.get("/procesos/{codigo}/cambio")
def listar_cambio(codigo: str, session: Session = Depends(get_session)):
    return {"success": True, "data": _manejar(lambda: CambioService.listar(session, codigo))}


@router.post("/procesos/{codigo}/cambio")
def crear_accion_cambio(codigo: str, datos: AccionCambioEntrada, session: Session = Depends(get_session)):
    data = _manejar(lambda: CambioService.crear(session, codigo, datos.model_dump(exclude_unset=True)))
    return {"success": True, "message": "Acción de cambio registrada", "data": data}


@router.put("/cambio/{accion_id}")
def actualizar_accion_cambio(accion_id: int, datos: AccionCambioEntrada, session: Session = Depends(get_session)):
    data = _manejar(lambda: CambioService.actualizar(session, accion_id, datos.model_dump(exclude_unset=True)))
    return {"success": True, "message": "Acción de cambio actualizada", "data": data}


@router.delete("/cambio/{accion_id}")
def eliminar_accion_cambio(accion_id: int, session: Session = Depends(get_session)):
    _manejar(lambda: CambioService.eliminar(session, accion_id))
    return {"success": True, "message": "Acción de cambio eliminada"}

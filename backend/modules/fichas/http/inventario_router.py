from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from modules.fichas.application.errores import ErrorValidacion
from modules.fichas.application.inventario_service import InventarioService
from modules.fichas.application.sincronizador import Sincronizador
from modules.fichas.infrastructure.database import get_session

router = APIRouter(prefix="/api/inventario", tags=["inventario"])


class ProcesoCrear(BaseModel):
    codigo: str
    nombre: str
    producto: str | None = None
    base_legal: str | None = None
    codigo_padre: str | None = None


class ProcesoActualizar(BaseModel):
    codigo: str | None = None
    nombre: str | None = None
    producto: str | None = None
    base_legal: str | None = None
    codigo_padre: str | None = None


def _proceso_dict(proceso) -> dict:
    return {
        "id": proceso.id,
        "codigo": proceso.codigo,
        "nombre": proceso.nombre,
        "producto": proceso.producto,
        "base_legal": proceso.base_legal,
        "nivel": proceso.nivel,
        "codigo_padre": proceso.codigo_padre,
    }


@router.get("")
def listar_inventario(session: Session = Depends(get_session)):
    return {"success": True, "data": InventarioService.arbol(session)}


@router.post("")
def crear_proceso(datos: ProcesoCrear, session: Session = Depends(get_session)):
    try:
        proceso = InventarioService.crear(session, datos.model_dump())
    except ErrorValidacion as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"success": True, "message": "Proceso creado", "data": _proceso_dict(proceso)}


@router.put("/{proceso_id}")
def actualizar_proceso(proceso_id: int, datos: ProcesoActualizar, session: Session = Depends(get_session)):
    try:
        # exclude_unset: solo se tocan los campos que el cliente envió
        proceso = InventarioService.actualizar(session, proceso_id, datos.model_dump(exclude_unset=True))
    except ErrorValidacion as e:
        raise HTTPException(status_code=400, detail=str(e))
    # El dashboard/objetivos leen del store en memoria: reflejar el cambio de nombre
    Sincronizador.rehidratar()
    return {"success": True, "message": "Proceso actualizado", "data": _proceso_dict(proceso)}


@router.delete("/{proceso_id}")
def eliminar_proceso(proceso_id: int, session: Session = Depends(get_session)):
    try:
        InventarioService.eliminar(session, proceso_id)
    except ErrorValidacion as e:
        raise HTTPException(status_code=400, detail=str(e))
    Sincronizador.rehidratar()
    return {"success": True, "message": "Proceso eliminado"}


@router.post("/plantilla")
def cargar_plantilla(session: Session = Depends(get_session)):
    creados = InventarioService.cargar_plantilla(session)
    return {"success": True, "message": f"{creados} procesos agregados", "data": {"creados": creados}}

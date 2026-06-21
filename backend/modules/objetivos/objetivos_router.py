from fastapi import APIRouter

from modules.objetivos.objetivos_service import ObjetivosService

router = APIRouter(prefix="/api")


@router.get("/objetivos")
def objetivos():
    return {"success": True, "data": ObjetivosService.obtener_objetivos()}

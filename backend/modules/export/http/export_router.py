from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlmodel import Session

from modules.export.application.export_service import ExportService
from modules.fichas.infrastructure.database import get_session

router = APIRouter(prefix="/api/export", tags=["export"])

_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.get("/excel")
def exportar_excel(session: Session = Depends(get_session)):
    """Descarga un Excel con todo el estado actual del sistema (datos + mejora)."""
    contenido = ExportService.construir(session)
    nombre = ExportService.nombre_archivo(session)
    return StreamingResponse(
        iter([contenido]),
        media_type=_XLSX,
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )

import asyncio
from contextlib import asynccontextmanager
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from modules.dashboard.application.dashboard_service import DashboardService
from modules.dashboard.http.dashboard_router import router as dashboard_router
from modules.procesos.http.procesos_router import router as procesos_router
from modules.procesos.infrastructure.excel_reader import ExcelStore

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

logger = logging.getLogger(__name__)

INTERVALO_VIGILANCIA_SEG = int(os.getenv("EXCEL_WATCH_INTERVAL", "5"))


async def _vigilar_excel():
    # Polling por mtime: funciona igual en Linux, Windows y volúmenes Docker
    while True:
        await asyncio.sleep(INTERVALO_VIGILANCIA_SEG)
        try:
            await asyncio.to_thread(ExcelStore.recargar_si_cambio)
        except Exception as e:
            logger.warning(f"Error vigilando el Excel: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    excel_path = os.getenv("EXCEL_PATH", "../datos_estandarizados.xlsx")
    ExcelStore.cargar(excel_path)
    vigilante = asyncio.create_task(_vigilar_excel())
    yield
    vigilante.cancel()


app = FastAPI(title="Dashboard CEPLAN", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


app.include_router(procesos_router)
app.include_router(dashboard_router)


@app.get("/health")
def health():
    return {"status": "ok", "registros_cargados": len(ExcelStore.get_all())}


@app.get("/api/meta")
def meta():
    data = ExcelStore.get_meta()
    data["procesos_en_rojo"] = DashboardService.contar_procesos_rojo()
    return {"success": True, "data": data}

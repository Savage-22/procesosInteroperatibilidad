import asyncio
from contextlib import asynccontextmanager
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from modules.chat.chat_router import router as chat_router
from modules.dashboard.application.dashboard_service import DashboardService
from modules.dashboard.http.dashboard_router import router as dashboard_router
from modules.fichas.application.sincronizador import Sincronizador
from modules.fichas.http.ficha_proceso_router import router as ficha_proceso_router
from modules.fichas.http.inventario_router import router as inventario_router
from modules.fichas.infrastructure.database import init_db
from modules.objetivos.objetivos_router import router as objetivos_router
from modules.plantilla.plantilla_router import router as plantilla_router
from modules.procesos.http.procesos_router import router as procesos_router
from modules.procesos.infrastructure.excel_reader import ExcelStore

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

logger = logging.getLogger(__name__)

INTERVALO_VIGILANCIA_SEG = int(os.getenv("EXCEL_WATCH_INTERVAL", "5"))


async def _vigilar_excel():
    # Polling por mtime: funciona igual en Linux, Windows y volúmenes Docker.
    # Si el Excel semilla cambia, se reimporta a la BD y se rehidrata el store.
    while True:
        await asyncio.sleep(INTERVALO_VIGILANCIA_SEG)
        try:
            await asyncio.to_thread(Sincronizador.recargar_si_cambio)
        except Exception as e:
            logger.warning(f"Error vigilando el Excel: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # La BD es la fuente de verdad; el Excel es semilla y vía de importación.
    init_db()
    excel_path = os.getenv("EXCEL_PATH", "../datos_estandarizados.xlsx")
    Sincronizador.configurar(excel_path)
    Sincronizador.iniciar()
    vigilante = asyncio.create_task(_vigilar_excel())
    yield
    vigilante.cancel()


app = FastAPI(title="SIIP — Sistema Inteligente de Interoperabilidad de Procesos", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


app.include_router(procesos_router)
app.include_router(dashboard_router)
app.include_router(plantilla_router)
app.include_router(objetivos_router)
app.include_router(chat_router)
app.include_router(inventario_router)
app.include_router(ficha_proceso_router)


@app.get("/health")
def health():
    return {"status": "ok", "registros_cargados": len(ExcelStore.get_all())}


@app.get("/api/meta")
def meta():
    data = ExcelStore.get_meta()
    data["procesos_en_rojo"] = DashboardService.contar_procesos_rojo()
    return {"success": True, "data": data}

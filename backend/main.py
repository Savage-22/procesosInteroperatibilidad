from contextlib import asynccontextmanager
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from modules.procesos.infrastructure.excel_reader import ExcelStore

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    excel_path = os.getenv("EXCEL_PATH", "../datos_estandarizados.xlsx")
    ExcelStore.cargar(excel_path)
    yield


app = FastAPI(title="Dashboard CEPLAN", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "registros_cargados": len(ExcelStore.get_all())}

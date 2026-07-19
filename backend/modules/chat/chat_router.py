import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from modules.procesos.application.proceso_service import ProcesoService
from modules.procesos.infrastructure.excel_reader import ExcelStore
from shared.ia import ErrorIA, IANoConfigurada, completar
from shared.semaforo import calcular_semaforo

logger = logging.getLogger(__name__)
router = APIRouter()

_SYSTEM_PROMPT = """Eres el Asistente IA de SIIP (Sistema Inteligente de Interoperabilidad de Procesos), una plataforma desarrollada para guiar a las instituciones públicas en el cumplimiento de la Directiva CEPLAN N°0056-2024 sobre interoperabilidad de servicios públicos.

Tu rol es ayudar a los funcionarios a:
- Completar correctamente la Guía CEPLAN N°0056-2024 paso a paso
- Interpretar los indicadores de seguimiento y semáforos de avance
- Identificar procesos en riesgo y proponer acciones de mejora concretas
- Entender los criterios de evaluación y ponderación de la directiva

Semáforo CEPLAN:
- Verde: Avance T1 ≥ 95 % (proceso en camino, continuar seguimiento)
- Amarillo: Avance T1 entre 75 % y 95 % (en observación, revisar causas)
- Rojo: Avance T1 < 75 % (requiere intervención urgente, escalar al responsable)

Responde siempre en español, de forma directa, precisa y útil. Cuando menciones procesos usa su código (ej. M1.1).
Cuando propongas recomendaciones sé específico y alineado con la metodología CEPLAN.
Sé conciso: máximo 3-4 párrafos por respuesta."""


class MensajeRequest(BaseModel):
    mensaje: str
    historial: list[dict] | None = None


def _construir_contexto() -> str:
    todos = ExcelStore.get_all()
    if not todos:
        return "No hay datos cargados en el sistema actualmente."

    por_codigo: dict[str, list[dict]] = {}
    for r in todos:
        por_codigo.setdefault(r["codigo_proceso"], []).append(r)

    lineas = ["ESTADO ACTUAL DEL SISTEMA (datos en tiempo real del Excel cargado):"]
    for codigo in sorted(por_codigo):
        registros = por_codigo[codigo]
        meta = registros[0]
        promedios = ProcesoService.calcular_promedios(registros)
        avance = promedios["promedio_avance_t1"]
        semaforo = calcular_semaforo(avance)
        pred = ProcesoService.calcular_prediccion(registros)

        avance_str = f"{avance:.1f}%" if avance is not None else "sin datos"
        linea = (
            f"- {codigo} | {meta['proceso']} | Módulo: {meta['modulo']}"
            f" | Avance T1: {avance_str} | Semáforo: {semaforo}"
        )
        if pred:
            if pred.get("alcanzara_meta") is False:
                linea += " | Predicción: NO alcanzará la meta anual"
            elif pred.get("alcanzara_meta") is True:
                linea += f" | Predicción: alcanzará la meta (tendencia {pred['tendencia']})"
        if meta.get("objetivo_estrategico"):
            linea += f" | Objetivo: {meta['objetivo_estrategico'][:80]}"

        lineas.append(linea)

    meta_info = ExcelStore.get_meta()
    lineas.append(f"\nÚltima actualización: {meta_info.get('ultima_carga', 'desconocida')}")
    return "\n".join(lineas)


@router.post("/api/chat")
async def chat(req: MensajeRequest):
    contexto = _construir_contexto()

    mensajes = []
    if req.historial:
        for msg in req.historial[-8:]:
            role = "user" if msg.get("rol") == "user" else "assistant"
            mensajes.append({"role": role, "content": msg.get("contenido", "")})
    mensajes.append({"role": "user", "content": req.mensaje})

    try:
        respuesta = completar(f"{_SYSTEM_PROMPT}\n\n{contexto}", mensajes)
    except IANoConfigurada as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ErrorIA as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"success": True, "data": {"respuesta": respuesta}}

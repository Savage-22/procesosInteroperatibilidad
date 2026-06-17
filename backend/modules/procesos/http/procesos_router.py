import io

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
import pandas as pd

from modules.procesos.application.proceso_service import ProcesoService
from modules.procesos.infrastructure.excel_reader import ExcelStore
from shared.meses import ordenar_por_mes
from shared.semaforo import calcular_semaforo

router = APIRouter(prefix="/api")

_PALETA = [
    "#1e3654", "#f4d100", "#1f7a47", "#9c1d1d",
    "#0075ca", "#6f42c1", "#d93f0b", "#0e8a16", "#0c2f56",
]


def _agrupar_por_codigo(registros: list[dict]) -> dict[str, list[dict]]:
    grupos: dict[str, list[dict]] = {}
    for r in registros:
        grupos.setdefault(r["codigo_proceso"], []).append(r)
    return grupos


# ------------------------------------------------------------------ #
# Issue #11 — GET /api/procesos                                       #
# ------------------------------------------------------------------ #

@router.get("/procesos")
def listar_procesos():
    todos = ExcelStore.get_all()
    grupos = _agrupar_por_codigo(todos)

    # Ponderadores por módulo usando la fórmula CEPLAN Tabla A5
    por_modulo: dict[str, dict[str, int]] = {}
    for codigo, registros in grupos.items():
        modulo = registros[0]["modulo"]
        por_modulo.setdefault(modulo, {})[codigo] = registros[0].get("relevancia", 1)

    ponderadores: dict[str, float] = {}
    for modulo, rel_map in por_modulo.items():
        ponderadores.update(ProcesoService.calcular_ponderadores(rel_map))

    resultado = []
    for codigo, registros in sorted(grupos.items()):
        primer = registros[0]
        promedios = ProcesoService.calcular_promedios(registros)
        avance = promedios["promedio_avance_t1"]

        resultado.append({
            "codigo": codigo,
            "proceso": primer["proceso"],
            "indicador": primer["indicador"],
            "meta_texto": primer["meta_texto"],
            "meta_final": primer["meta_final"],
            "modulo": primer["modulo"],
            "es_descendente": primer["es_descendente"],
            "relevancia": primer.get("relevancia", 1),
            "ponderador": ponderadores.get(codigo, 1.0),
            "promedio_resultado_obtenido": promedios["promedio_resultado_obtenido"],
            "promedio_avance_t1": avance,
            "semaforo": calcular_semaforo(avance),
            "brecha": ProcesoService.calcular_brecha(registros),
            "mejora": ProcesoService.calcular_mejora(registros),
        })

    return {"success": True, "data": resultado}


# ------------------------------------------------------------------ #
# Issue #12 — GET /api/procesos/{codigo}                              #
# ------------------------------------------------------------------ #

@router.get("/procesos/{codigo}")
def detalle_proceso(codigo: str):
    registros = ExcelStore.get_por_codigo(codigo.upper())
    if not registros:
        raise HTTPException(status_code=404, detail=f"Proceso '{codigo}' no encontrado")

    primer = registros[0]
    meses = []
    for r in ordenar_por_mes(registros):
        avance = ProcesoService.calcular_avance_t1(
            r.get("resultado_obtenido"),
            r.get("resultado_esperado"),
            r.get("es_descendente", False),
        )
        meses.append({
            "mes": r["mes"],
            "anio": r["anio"],
            "numerador": r["numerador"],
            "denominador": r["denominador"],
            "resultado_esperado": r["resultado_esperado"],
            "resultado_obtenido": r["resultado_obtenido"],
            "diferencia": r["diferencia"],
            "avance_t1": avance,
            "semaforo": calcular_semaforo(avance),
        })

    # Relevancia y ponderador dentro del módulo
    modulo = primer["modulo"]
    rel_dedup: dict[str, int] = {}
    for r in ExcelStore.get_por_modulo(modulo):
        c = r.get("codigo_proceso")
        if c and c not in rel_dedup:
            rel_dedup[c] = r.get("relevancia", 1)

    ponderadores_mod = ProcesoService.calcular_ponderadores(rel_dedup)

    return {
        "success": True,
        "data": {
            "codigo": codigo.upper(),
            "proceso": primer["proceso"],
            "indicador": primer["indicador"],
            "meta_texto": primer["meta_texto"],
            "meta_final": primer["meta_final"],
            "modulo": modulo,
            "es_descendente": primer["es_descendente"],
            "relevancia": primer.get("relevancia", 1),
            "ponderador": ponderadores_mod.get(codigo.upper(), 1.0),
            "mejora": ProcesoService.calcular_mejora(registros),
            "meses": meses,
        },
    }


# ------------------------------------------------------------------ #
# Issue #37 — POST /api/upload                                        #
# ------------------------------------------------------------------ #

@router.post("/upload")
async def subir_excel(archivo: UploadFile = File(...)):
    if not archivo.filename or not archivo.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="El archivo debe ser un Excel (.xlsx)")

    contenido = await archivo.read()

    # Se valida antes de escribir para no pisar el archivo bueno con uno corrupto
    try:
        pd.ExcelFile(io.BytesIO(contenido))
    except Exception:
        raise HTTPException(status_code=400, detail="El archivo no es un Excel legible")

    ruta = ExcelStore.get_ruta()
    if not ruta:
        raise HTTPException(status_code=500, detail="El servidor no tiene configurada la ruta del Excel")

    try:
        with open(ruta, "wb") as f:
            f.write(contenido)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"No se pudo guardar el archivo: {e}")

    ExcelStore.cargar(ruta)
    return {"success": True, "data": ExcelStore.get_meta()}


# ------------------------------------------------------------------ #
# Issue #14 — GET /api/comparativa                                    #
# ------------------------------------------------------------------ #

@router.get("/comparativa")
def comparativa(codigos: str | None = Query(default=None)):
    if codigos:
        filtro = {c.strip().upper() for c in codigos.split(",")}
        fuente = [r for r in ExcelStore.get_all() if r["codigo_proceso"] in filtro]
    else:
        fuente = ExcelStore.get_all()

    grupos = _agrupar_por_codigo(fuente)
    resultado = []

    for i, (codigo, registros) in enumerate(sorted(grupos.items())):
        meses = []
        for r in ordenar_por_mes(registros):
            avance = ProcesoService.calcular_avance_t1(
                r.get("resultado_obtenido"),
                r.get("resultado_esperado"),
                r.get("es_descendente", False),
            )
            meses.append({
                "mes": r["mes"],
                "resultado_obtenido": r["resultado_obtenido"],
                "avance_t1": avance,
            })

        resultado.append({
            "codigo": codigo,
            "proceso": registros[0]["proceso"],
            "modulo": registros[0]["modulo"],
            "color_hex": _PALETA[i % len(_PALETA)],
            "meses": meses,
        })

    return {"success": True, "data": resultado}


# ------------------------------------------------------------------ #
# GET /api/predicciones — proyección de tendencia hasta diciembre     #
# ------------------------------------------------------------------ #

@router.get("/predicciones")
def predicciones():
    todos = ExcelStore.get_all()
    grupos = _agrupar_por_codigo(todos)

    por_modulo: dict[str, dict[str, int]] = {}
    for codigo, registros in grupos.items():
        modulo = registros[0]["modulo"]
        por_modulo.setdefault(modulo, {})[codigo] = registros[0].get("relevancia", 1)

    ponderadores: dict[str, float] = {}
    for modulo, rel_map in por_modulo.items():
        ponderadores.update(ProcesoService.calcular_ponderadores(rel_map))

    resultado = []
    for codigo, registros in sorted(grupos.items()):
        primer = registros[0]
        prediccion = ProcesoService.calcular_prediccion(registros)
        promedios = ProcesoService.calcular_promedios(registros)
        avance = promedios["promedio_avance_t1"]

        resultado.append({
            "codigo": codigo,
            "proceso": primer["proceso"],
            "indicador": primer["indicador"],
            "modulo": primer["modulo"],
            "unidad": "días" if primer["es_descendente"] else "%",
            "relevancia": primer.get("relevancia", 1),
            "ponderador": ponderadores.get(codigo, 1.0),
            "semaforo": calcular_semaforo(avance),
            "prediccion": prediccion,
        })

    return {"success": True, "data": resultado}


# ------------------------------------------------------------------ #
# Issue #15 — GET /api/pareto                                         #
# ------------------------------------------------------------------ #

@router.get("/pareto")
def pareto():
    items = ProcesoService.calcular_pareto(ExcelStore.get_all())

    umbral_80 = next(
        (i for i, item in enumerate(items) if item["porcentaje_acumulado"] >= 80),
        len(items) - 1,
    )

    return {"success": True, "data": {"items": items, "umbral_80": umbral_80}}

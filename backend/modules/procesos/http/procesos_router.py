import io

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
import pandas as pd

from modules.fichas.application.sincronizador import Sincronizador
from modules.procesos.application.proceso_service import ProcesoService
from modules.procesos.infrastructure.excel_reader import ExcelStore
from shared.meses import orden_mes, ordenar_por_mes
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

    ruta = Sincronizador.get_ruta()
    if not ruta:
        raise HTTPException(status_code=500, detail="El servidor no tiene configurada la ruta del Excel")

    try:
        with open(ruta, "wb") as f:
            f.write(contenido)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"No se pudo guardar el archivo: {e}")

    # Importa/actualiza en la BD (upsert) y rehidrata el store en memoria
    Sincronizador.importar_archivo(ruta)
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
# GET /api/metodologia — cálculos paso a paso para cada métrica       #
# ------------------------------------------------------------------ #

@router.get("/metodologia")
def metodologia():
    todos = ExcelStore.get_all()
    grupos = _agrupar_por_codigo(todos)

    # --- Semáforo ---
    conteos = {"Verde": 0, "Amarillo": 0, "Rojo": 0, "Sin datos": 0}
    for registros in grupos.values():
        promedios = ProcesoService.calcular_promedios(registros)
        s = calcular_semaforo(promedios["promedio_avance_t1"])
        conteos[s] = conteos.get(s, 0) + 1

    # --- Ponderadores por módulo (paso a paso) ---
    por_modulo: dict[str, list[dict]] = {}
    for codigo, registros in grupos.items():
        primer = registros[0]
        modulo = primer["modulo"]
        por_modulo.setdefault(modulo, []).append({
            "codigo": codigo,
            "proceso": primer["proceso"],
            "relevancia": primer.get("relevancia", 1),
        })

    modulos_detalle = []
    for modulo, indicadores in sorted(por_modulo.items()):
        rel_map = {ind["codigo"]: ind["relevancia"] for ind in indicadores}
        r_min = max(rel_map.values())
        pesos_brutos = {c: r_min - (r - 1) for c, r in rel_map.items()}
        total_pesos = sum(pesos_brutos.values())
        ponderadores = ProcesoService.calcular_ponderadores(rel_map)

        indicadores_detalle = []
        for ind in sorted(indicadores, key=lambda x: x["codigo"]):
            c = ind["codigo"]
            r = ind["relevancia"]
            pb = pesos_brutos[c]
            pond = ponderadores[c]
            indicadores_detalle.append({
                "codigo": c,
                "proceso": ind["proceso"],
                "relevancia": r,
                "descripcion_relevancia": {1: "Muy relevante", 2: "Relevante", 3: "Menos relevante"}.get(r, ""),
                "formula": f"({r_min} − ({r} − 1)) / {total_pesos} = {pb}/{total_pesos}",
                "peso_bruto": pb,
                "ponderador": pond,
                "ponderador_porcentaje": round(pond * 100, 1),
            })

        modulos_detalle.append({
            "modulo": modulo,
            "r_min": r_min,
            "total_pesos": total_pesos,
            "indicadores": indicadores_detalle,
        })

    # --- Avance T1 por proceso: ejemplo con el último mes con datos ---
    avance_ejemplos = []
    for codigo, registros in sorted(grupos.items()):
        primer = registros[0]
        es_desc = primer.get("es_descendente", False)
        meses_ordenados = sorted(
            [r for r in registros if r.get("resultado_obtenido") is not None and r.get("resultado_esperado") is not None],
            key=lambda r: orden_mes(r["mes"]),
        )
        if not meses_ordenados:
            continue

        # Tomar el último mes para el ejemplo
        ej = meses_ordenados[-1]
        vo = ej["resultado_obtenido"]
        le = ej["resultado_esperado"]
        avance = ProcesoService.calcular_avance_t1(vo, le, es_desc)

        if es_desc:
            formula_tex = f"min(100, ({le} / {vo}) × 100) = {avance}%"
        else:
            formula_tex = f"min(100, ({vo} / {le}) × 100) = {avance}%"

        avance_ejemplos.append({
            "codigo": codigo,
            "proceso": primer["proceso"],
            "mes": ej["mes"],
            "es_descendente": es_desc,
            "resultado_obtenido": vo,
            "resultado_esperado": le,
            "avance_t1": avance,
            "formula": formula_tex,
            "semaforo": calcular_semaforo(avance),
            "todos_los_meses": [
                {
                    "mes": r["mes"],
                    "resultado_obtenido": r["resultado_obtenido"],
                    "resultado_esperado": r["resultado_esperado"],
                    "avance_t1": ProcesoService.calcular_avance_t1(
                        r["resultado_obtenido"], r["resultado_esperado"], es_desc
                    ),
                    "semaforo": calcular_semaforo(
                        ProcesoService.calcular_avance_t1(r["resultado_obtenido"], r["resultado_esperado"], es_desc)
                    ),
                }
                for r in meses_ordenados
            ],
        })

    # --- Mejora por proceso ---
    mejoras = []
    for codigo, registros in sorted(grupos.items()):
        mejora = ProcesoService.calcular_mejora(registros)
        if mejora:
            primer = registros[0]
            es_desc = primer.get("es_descendente", False)
            unidad = "días" if es_desc else "%"
            signo = "+" if mejora["mejora_absoluta"] >= 0 else ""
            mejoras.append({
                "codigo": codigo,
                "proceso": primer["proceso"],
                "primer_mes": mejora["primer_mes"],
                "ultimo_mes": mejora["ultimo_mes"],
                "primer_valor": mejora["primer_valor"],
                "ultimo_valor": mejora["ultimo_valor"],
                "mejora_absoluta": mejora["mejora_absoluta"],
                "es_mejora": mejora["es_mejora"],
                "formula": f"{mejora['ultimo_valor']} − {mejora['primer_valor']} = {signo}{mejora['mejora_absoluta']} {unidad}",
                "unidad": unidad,
            })

    # --- Predicción: parámetros de la regresión para cada proceso ---
    predicciones_info = []
    for codigo, registros in sorted(grupos.items()):
        pred = ProcesoService.calcular_prediccion(registros)
        if pred:
            primer = registros[0]
            es_desc = primer.get("es_descendente", False)
            unidad = "días" if es_desc else "%"
            predicciones_info.append({
                "codigo": codigo,
                "proceso": primer["proceso"],
                "meses_con_datos": pred["meses_con_datos"],
                "pendiente": pred["pendiente"],
                "r_cuadrado": pred["r_cuadrado"],
                "tendencia": pred["tendencia"],
                "valor_diciembre": pred["valor_diciembre"],
                "meta_final": pred["meta_final"],
                "alcanzara_meta": pred["alcanzara_meta"],
                "mes_alcanza_meta": pred["mes_alcanza_meta"],
                "formula_regresion": f"y = {pred['pendiente']:+.2f}·mes + cte  (R²={pred['r_cuadrado']})",
                "unidad": unidad,
            })

    return {
        "success": True,
        "data": {
            "semaforo": {
                "umbrales": {"verde": 95, "amarillo": 75},
                "conteos": conteos,
                "total": len(grupos),
            },
            "modulos": modulos_detalle,
            "avance_t1": avance_ejemplos,
            "mejora": mejoras,
            "prediccion": predicciones_info,
        },
    }


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

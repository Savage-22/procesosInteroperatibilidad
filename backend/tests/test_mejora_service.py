import pytest
from sqlmodel import Session, SQLModel, create_engine

from modules.fichas.application.alertas_service import AlertasMejoraService
from modules.fichas.application.cambio_service import CambioService
from modules.fichas.application.causa_service import CausaService
from modules.fichas.application.comparacion_service import ComparacionService
from modules.fichas.application.errores import ErrorValidacion
from modules.fichas.application.indicador_service import IndicadorService
from modules.fichas.application.inventario_service import InventarioService
from modules.fichas.application.oportunidad_service import (
    OportunidadService,
    clasificar_factibilidad,
    nivel_riesgo,
)


@pytest.fixture
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


@pytest.fixture
def proceso(session):
    return InventarioService.crear(session, {"codigo": "M3.1", "nombre": "Análisis"})


# ── #56 Causas / Ishikawa / Pareto ────────────────────────────────────────────

def test_crear_causa_categoria_invalida_falla(session, proceso):
    with pytest.raises(ErrorValidacion, match="Categoría"):
        CausaService.crear(session, "M3.1", {"categoria": "Otro", "descripcion": "x"})


def test_ishikawa_agrupa_por_6m(session, proceso):
    CausaService.crear(session, "M3.1", {"categoria": "Método", "descripcion": "Sin procedimiento", "peso": 5})
    CausaService.crear(session, "M3.1", {"categoria": "Personas", "descripcion": "Falta capacitación", "peso": 3})
    data = CausaService.listar(session, "M3.1")
    assert len(data["ishikawa"]["Método"]) == 1
    assert len(data["ishikawa"]["Personas"]) == 1
    assert data["ishikawa"]["Entorno"] == []


def test_pareto_ordena_por_peso_y_marca_corte_80(session, proceso):
    CausaService.crear(session, "M3.1", {"categoria": "Método", "descripcion": "A", "peso": 50})
    CausaService.crear(session, "M3.1", {"categoria": "Personas", "descripcion": "B", "peso": 30})
    CausaService.crear(session, "M3.1", {"categoria": "Entorno", "descripcion": "C", "peso": 15})
    CausaService.crear(session, "M3.1", {"categoria": "Materiales", "descripcion": "D", "peso": 5})
    pareto = CausaService.listar(session, "M3.1")["pareto"]

    assert [it["descripcion"] for it in pareto["items"]] == ["A", "B", "C", "D"]
    assert pareto["items"][0]["porcentaje"] == 50.0
    assert pareto["items"][1]["porcentaje_acumulado"] == 80.0
    # El corte 80% se alcanza en el segundo ítem (índice 1)
    assert pareto["umbral_80"] == 1


# ── #57 Oportunidades / F = C × I ─────────────────────────────────────────────

def test_clasificar_factibilidad_rangos():
    assert clasificar_factibilidad(1) == "Inmediato"
    assert clasificar_factibilidad(7) == "Inmediato"
    assert clasificar_factibilidad(8) == "Corto plazo"
    assert clasificar_factibilidad(14) == "Corto plazo"
    assert clasificar_factibilidad(15) == "Analizar"
    assert clasificar_factibilidad(25) == "Analizar"


def test_nivel_riesgo():
    assert nivel_riesgo(4) == "Bajo"
    assert nivel_riesgo(9) == "Medio"
    assert nivel_riesgo(12) == "Alto"
    assert nivel_riesgo(20) == "Extremo"


def test_oportunidad_calcula_f_y_plazo(session, proceso):
    data = OportunidadService.crear(session, "M3.1", {
        "descripcion": "Automatizar registro", "costo": 2, "impacto": 3,
        "probabilidad": 4, "consecuencia": 4,
    })
    assert data["factibilidad"] == 6       # 2 × 3
    assert data["plazo"] == "Inmediato"
    assert data["riesgo"] == 16            # 4 × 4
    assert data["nivel_riesgo"] == "Extremo"


def test_escalas_se_acotan_1_a_5(session, proceso):
    data = OportunidadService.crear(session, "M3.1", {"descripcion": "x", "costo": 9, "impacto": 0})
    assert data["costo"] == 5
    assert data["impacto"] == 1


def test_listado_priorizado_por_factibilidad(session, proceso):
    OportunidadService.crear(session, "M3.1", {"descripcion": "Cara", "costo": 5, "impacto": 5})   # F=25
    OportunidadService.crear(session, "M3.1", {"descripcion": "Barata", "costo": 1, "impacto": 3})  # F=3
    lista = OportunidadService.listar(session, "M3.1")
    assert lista[0]["descripcion"] == "Barata"
    assert lista[-1]["descripcion"] == "Cara"


# ── #58 Comparación Antes/Después ─────────────────────────────────────────────

def _indicador_con_medicion(session):
    ind = IndicadorService.crear(session, "M3.1", {"nombre": "% atención", "sentido": "Ascendente", "unidad": "%", "meta_final": 90})
    IndicadorService.guardar_medicion(session, ind["id"], {"mes": "Junio", "numerador": 60, "denominador": 100, "resultado_esperado": 90})
    return ind


def test_comparacion_sin_proyeccion(session, proceso):
    _indicador_con_medicion(session)
    data = ComparacionService.comparacion(session, "M3.1")
    ind = data["indicadores"][0]
    assert ind["tiene_proyeccion"] is False
    assert ind["real"][0]["valor"] == 60.0
    assert ind["mejora"] is None


def test_guardar_proyeccion_calcula_mejora(session, proceso):
    ind = _indicador_con_medicion(session)
    ComparacionService.guardar_proyeccion(session, ind["id"], {
        "meses": [{"mes": "Julio", "anio": 2025, "valor": 80}, {"mes": "Agosto", "anio": 2025, "valor": 90}],
    })
    data = ComparacionService.comparacion(session, "M3.1")
    ind_cmp = data["indicadores"][0]
    assert ind_cmp["tiene_proyeccion"] is True
    m = ind_cmp["mejora"]
    # Real: 60/90 = 66.67% avance. Proyectado final 90/90 = 100%
    assert m["valor_antes"] == 60.0
    assert m["valor_despues"] == 90.0
    assert m["semaforo_despues"] == "Verde"
    assert m["mejora_pp"] > 0
    assert m["mes_alcanza_meta"] == "Agosto"


def test_sugerir_proyeccion_rampa_hacia_meta(session, proceso):
    ind = _indicador_con_medicion(session)  # último real Junio=60, meta 90
    sugerida = ComparacionService.sugerir_proyeccion(session, ind["id"])
    meses = sugerida["meses"]
    assert meses[0]["mes"] == "Julio"
    assert meses[-1]["mes"] == "Diciembre"
    assert meses[-1]["valor"] == 90.0     # llega a la meta en diciembre


# ── #63 Gestión del cambio (Kurt Lewin) ───────────────────────────────────────

def test_crear_accion_cambio_etapa_invalida_falla(session, proceso):
    with pytest.raises(ErrorValidacion, match="Etapa"):
        CambioService.crear(session, "M3.1", {"etapa": "otra", "descripcion": "x"})


def test_cambio_agrupa_por_etapa_lewin(session, proceso):
    CambioService.crear(session, "M3.1", {"etapa": "descongelar", "descripcion": "Comunicar necesidad"})
    CambioService.crear(session, "M3.1", {"etapa": "cambiar", "descripcion": "Automatizar registro"})
    data = CambioService.listar(session, "M3.1")
    assert data["etapas"] == ["descongelar", "cambiar", "recongelar"]
    assert len(data["acciones"]["descongelar"]) == 1
    assert len(data["acciones"]["cambiar"]) == 1
    assert data["acciones"]["recongelar"] == []


def test_cambio_calcula_progreso(session, proceso):
    a1 = CambioService.crear(session, "M3.1", {"etapa": "cambiar", "descripcion": "A"})
    CambioService.crear(session, "M3.1", {"etapa": "cambiar", "descripcion": "B"})
    CambioService.actualizar(session, a1["id"], {"estado": "hecho"})
    prog = CambioService.listar(session, "M3.1")["progreso"]
    assert prog["total"] == 2
    assert prog["hechas"] == 1
    assert prog["porcentaje"] == 50.0


def test_cambio_estado_invalido_falla(session, proceso):
    with pytest.raises(ErrorValidacion, match="Estado"):
        CambioService.crear(session, "M3.1", {"etapa": "cambiar", "descripcion": "A", "estado": "raro"})


def test_cambio_eliminar_es_soft_delete(session, proceso):
    a = CambioService.crear(session, "M3.1", {"etapa": "recongelar", "descripcion": "Estandarizar"})
    CambioService.eliminar(session, a["id"])
    assert CambioService.listar(session, "M3.1")["acciones"]["recongelar"] == []


# ── #65 Alertas autónomas de mejora ───────────────────────────────────────────

def _proceso_con_avance(session, codigo, obtenido, meta=90):
    InventarioService.crear(session, {"codigo": codigo, "nombre": f"Proc {codigo}"})
    ind = IndicadorService.crear(session, codigo, {"nombre": "% x", "sentido": "Ascendente", "unidad": "%", "meta_final": meta})
    IndicadorService.guardar_medicion(session, ind["id"], {"mes": "Junio", "numerador": obtenido, "denominador": 100, "resultado_esperado": meta})
    return ind


def test_alerta_proceso_en_rojo_aparece_como_critico(session, proceso):
    _proceso_con_avance(session, "M3.2", obtenido=50)   # avance 55.5% → Rojo
    data = AlertasMejoraService.evaluar(session)
    codigos = [a["codigo"] for a in data["alertas"]]
    assert "M3.2" in codigos
    alerta = next(a for a in data["alertas"] if a["codigo"] == "M3.2")
    assert alerta["nivel"] == "critico"
    assert alerta["rojos"] == 1
    assert data["resumen"]["criticos"] >= 1


def test_alerta_proceso_todo_verde_no_aparece(session, proceso):
    _proceso_con_avance(session, "M3.3", obtenido=95)   # avance 100% → Verde
    data = AlertasMejoraService.evaluar(session)
    assert "M3.3" not in [a["codigo"] for a in data["alertas"]]


def test_alerta_usa_esperado_del_mes_y_no_la_meta_anual(session, proceso):
    # El proceso va cumpliendo mes a mes (78.12 sobre 75 esperado) aunque aún
    # está lejos de la meta anual de 90. El detalle lo muestra verde, así que el
    # dashboard tampoco debe pedirle una mejora.
    InventarioService.crear(session, {"codigo": "M1.1", "nombre": "Proc M1.1"})
    ind = IndicadorService.crear(session, "M1.1", {"nombre": "% x", "sentido": "Ascendente", "unidad": "%", "meta_final": 90})
    IndicadorService.guardar_medicion(session, ind["id"], {"mes": "Mayo", "numerador": 25, "denominador": 32, "resultado_esperado": 75})
    data = AlertasMejoraService.evaluar(session)
    assert "M1.1" not in [a["codigo"] for a in data["alertas"]]


def test_alertas_ordenadas_por_urgencia(session, proceso):
    _proceso_con_avance(session, "M3.4", obtenido=80)   # ámbar (atención)
    _proceso_con_avance(session, "M3.5", obtenido=40)   # rojo (crítico, mayor puntaje)
    data = AlertasMejoraService.evaluar(session)
    codigos = [a["codigo"] for a in data["alertas"]]
    assert codigos.index("M3.5") < codigos.index("M3.4")


def test_alerta_sugiere_ishikawa_si_no_hay_diagnostico(session, proceso):
    _proceso_con_avance(session, "M3.6", obtenido=50)
    data = AlertasMejoraService.evaluar(session)
    alerta = next(a for a in data["alertas"] if a["codigo"] == "M3.6")
    assert alerta["sugerencia"]["tab"] == "ishikawa"
    assert "sin análisis de mejora registrado" in alerta["motivos"]


def _proceso_medido_en(session, codigo, mes, obtenido, meta=90):
    InventarioService.crear(session, {"codigo": codigo, "nombre": f"Proc {codigo}"})
    ind = IndicadorService.crear(session, codigo, {"nombre": "% x", "sentido": "Ascendente", "unidad": "%", "meta_final": meta})
    IndicadorService.guardar_medicion(session, ind["id"], {"mes": mes, "numerador": obtenido, "denominador": 100, "resultado_esperado": meta})
    return ind


# ── Evaluación semestral por mes de corte (periodo Ene–Jun) ───────────────────

def test_alerta_reporta_periodo_y_mes_corte(session, proceso):
    _proceso_con_avance(session, "M3.7", obtenido=50)  # medición en Junio
    data = AlertasMejoraService.evaluar(session)
    assert data["periodo"]["etiqueta"] == "Enero–Junio"
    assert next(a for a in data["alertas"] if a["codigo"] == "M3.7")["mes_corte"] == "Junio"


def test_alerta_ignora_meses_fuera_del_periodo(session, proceso):
    # Única medición en Julio (fuera de S1) → proceso no evaluable, sin alerta
    InventarioService.crear(session, {"codigo": "M3.8", "nombre": "Proc M3.8"})
    ind = IndicadorService.crear(session, "M3.8", {"nombre": "% x", "sentido": "Ascendente", "unidad": "%", "meta_final": 90})
    IndicadorService.guardar_medicion(session, ind["id"], {"mes": "Julio", "numerador": 50, "denominador": 100, "resultado_esperado": 90})
    data = AlertasMejoraService.evaluar(session)  # S1 = Ene–Jun
    assert "M3.8" not in [a["codigo"] for a in data["alertas"]]


def test_corte_toma_ultimo_mes_con_dato_y_no_alerta_si_cumple(session, proceso):
    # Enero en rojo pero Mayo ya llegó a la meta → el corte es Mayo → sin alerta
    InventarioService.crear(session, {"codigo": "M3.9", "nombre": "Proc M3.9"})
    ind = IndicadorService.crear(session, "M3.9", {"nombre": "% x", "sentido": "Ascendente", "unidad": "%", "meta_final": 90})
    IndicadorService.guardar_medicion(session, ind["id"], {"mes": "Enero", "numerador": 40, "denominador": 100, "resultado_esperado": 90})
    IndicadorService.guardar_medicion(session, ind["id"], {"mes": "Mayo", "numerador": 95, "denominador": 100, "resultado_esperado": 90})
    data = AlertasMejoraService.evaluar(session)
    assert "M3.9" not in [a["codigo"] for a in data["alertas"]]


def test_evaluar_periodo_s2(session, proceso):
    _proceso_medido_en(session, "M4.9", "Agosto", obtenido=50)  # Agosto ∈ S2
    data = AlertasMejoraService.evaluar(session, "S2")
    assert data["periodo"]["etiqueta"] == "Julio–Diciembre"
    alerta = next(a for a in data["alertas"] if a["codigo"] == "M4.9")
    assert alerta["mes_corte"] == "Agosto"

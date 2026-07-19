import pytest
from sqlmodel import Session, SQLModel, create_engine

from modules.bitacora.application.bitacora_service import BitacoraService
from modules.fichas.application.causa_service import CausaService
from modules.fichas.application.comparacion_service import ComparacionService
from modules.fichas.application.indicador_service import IndicadorService
from modules.fichas.application.inventario_service import InventarioService
from modules.tablero.application.resultados_service import ResultadosService
from modules.tablero.application.tablero_service import TableroService


@pytest.fixture
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


def _proceso_medido(session, codigo="M3.1", meta=100.0, valores=((("Enero"), 50), ("Febrero", 80))):
    """Crea un proceso con un indicador y sus mediciones mensuales."""
    InventarioService.crear(session, {"codigo": codigo, "nombre": "Análisis"})
    ind = IndicadorService.crear(session, codigo, {
        "nombre": "% de avance", "unidad": "%", "meta_final": meta,
    })
    for mes, valor in valores:
        IndicadorService.guardar_medicion(session, ind["id"], {
            "mes": mes, "numerador": valor, "denominador": 100, "resultado_esperado": 90,
        })
    return ind


# ── Tablero ───────────────────────────────────────────────────────────────────

def test_tablero_usa_el_ultimo_mes_como_corte(session):
    _proceso_medido(session, valores=[("Enero", 50), ("Marzo", 80)])
    fila = TableroService.monitoreo(session)["indicadores"][0]
    assert fila["mes_corte"] == "Marzo"
    assert fila["valor_actual"] == 80.0
    assert fila["valor_previo"] == 50.0


def test_tablero_calcula_avance_contra_la_meta_final(session):
    _proceso_medido(session, meta=100.0, valores=[("Enero", 75)])
    fila = TableroService.monitoreo(session)["indicadores"][0]
    assert fila["avance"] == 75.0
    assert fila["semaforo"] == "Amarillo"  # 75 es justo el umbral ámbar
    assert fila["brecha"] == 25.0


def test_tablero_marca_rojo_bajo_el_umbral(session):
    _proceso_medido(session, meta=100.0, valores=[("Enero", 60)])
    assert TableroService.monitoreo(session)["indicadores"][0]["semaforo"] == "Rojo"


def test_tablero_detecta_tendencia_de_mejora(session):
    _proceso_medido(session, valores=[("Enero", 50), ("Febrero", 80)])
    assert TableroService.monitoreo(session)["indicadores"][0]["tendencia"] == "mejora"


def test_tablero_detecta_retroceso(session):
    _proceso_medido(session, valores=[("Enero", 80), ("Febrero", 50)])
    assert TableroService.monitoreo(session)["indicadores"][0]["tendencia"] == "retroceso"


def test_tablero_marca_estable_cuando_la_variacion_es_ruido(session):
    _proceso_medido(session, valores=[("Enero", 80), ("Febrero", 80.2)])
    assert TableroService.monitoreo(session)["indicadores"][0]["tendencia"] == "estable"


def test_tablero_en_descendente_bajar_es_mejorar(session):
    InventarioService.crear(session, {"codigo": "M2.1", "nombre": "Atención"})
    ind = IndicadorService.crear(session, "M2.1", {
        "nombre": "Días de atención", "unidad": "días", "sentido": "Descendente", "meta_final": 5,
    })
    for mes, valor in [("Enero", 10), ("Febrero", 6)]:
        IndicadorService.guardar_medicion(session, ind["id"], {"mes": mes, "resultado_obtenido": valor})

    fila = TableroService.monitoreo(session)["indicadores"][0]
    assert fila["tendencia"] == "mejora"
    assert fila["brecha"] == 1.0  # aún le falta 1 día para llegar a la meta


def test_tablero_cuenta_cumplimiento_del_esperado_mensual(session):
    # esperado 90 en ambos meses: solo Febrero (95) lo alcanza
    _proceso_medido(session, valores=[("Enero", 50), ("Febrero", 95)])
    fila = TableroService.monitoreo(session)["indicadores"][0]
    assert fila["meses_evaluados"] == 2
    assert fila["meses_cumplidos"] == 1
    assert fila["cumplimiento_mensual"] == 50.0


def test_tablero_señala_criticos_sin_plan_de_mejora(session):
    _proceso_medido(session, meta=100.0, valores=[("Enero", 40)])
    resumen = TableroService.monitoreo(session)["resumen"]
    assert resumen["rojo"] == 1
    assert resumen["criticos_sin_mejora"] == 1
    assert TableroService.monitoreo(session)["indicadores"][0]["tiene_mejora"] is False


def test_tablero_deja_de_marcar_critico_al_diagnosticar_causas(session):
    _proceso_medido(session, meta=100.0, valores=[("Enero", 40)])
    CausaService.crear(session, "M3.1", {"categoria": "Método", "descripcion": "Sin procedimiento"})

    data = TableroService.monitoreo(session)
    assert data["indicadores"][0]["tiene_mejora"] is True
    assert data["resumen"]["criticos_sin_mejora"] == 0


def test_tablero_solo_toma_meses_del_periodo(session):
    _proceso_medido(session, valores=[("Enero", 50), ("Agosto", 90)])
    # S1 = Enero–Junio: Agosto queda fuera
    fila_s1 = TableroService.monitoreo(session, "S1")["indicadores"][0]
    assert fila_s1["mes_corte"] == "Enero"

    fila_s2 = TableroService.monitoreo(session, "S2")["indicadores"][0]
    assert fila_s2["mes_corte"] == "Agosto"


def test_tablero_agrupa_por_modulo(session):
    _proceso_medido(session, codigo="M1.1", valores=[("Enero", 90)])
    _proceso_medido(session, codigo="M2.1", valores=[("Enero", 50)])
    modulos = {m["modulo"]: m for m in TableroService.monitoreo(session)["por_modulo"]}
    assert set(modulos) == {"M1", "M2"}
    assert modulos["M1"]["rojos"] == 0
    assert modulos["M2"]["rojos"] == 1


# ── Resultados ────────────────────────────────────────────────────────────────

def test_resultados_reporta_el_indicador_sin_mejora(session):
    _proceso_medido(session, meta=100.0, valores=[("Enero", 80)])
    data = ResultadosService.consolidado(session)
    proceso = data["procesos"][0]
    indicador = proceso["indicadores"][0]

    assert indicador["obtenido"] == 80.0
    assert indicador["ganancia_pp"] is None  # sin proyección no hay antes/después
    assert proceso["mejora"]["etapa"] == "sin_iniciar"
    assert data["resumen"]["indicadores_intervenidos"] == 0


def test_resultados_calcula_la_ganancia_de_la_mejora(session):
    ind = _proceso_medido(session, meta=100.0, valores=[("Enero", 60)])
    ComparacionService.guardar_proyeccion(session, ind["id"], {
        "meses": [{"mes": "Junio", "anio": 2025, "valor": 95}],
    })

    data = ResultadosService.consolidado(session)
    indicador = data["procesos"][0]["indicadores"][0]

    assert indicador["proyectado"] == 95.0
    assert indicador["ganancia_pp"] == 35.0  # de 60% a 95% de avance
    assert data["procesos"][0]["mejora"]["etapa"] == "proyectada"
    assert data["resumen"]["indicadores_intervenidos"] == 1


def test_resultados_omite_procesos_sin_nada_que_reportar(session):
    InventarioService.crear(session, {"codigo": "M3", "nombre": "Vacío"})
    assert ResultadosService.consolidado(session)["procesos"] == []


# ── Bitácora ──────────────────────────────────────────────────────────────────

def test_bitacora_deriva_el_estado_de_la_evidencia(session):
    data = BitacoraService.obtener(session)
    por_clave = {f["clave"]: f for f in data["fases"]}

    # Sin datos: solo la fase de alcance queda cerrada (la entidad siempre existe)
    assert por_clave["alcance"]["estado"] == "completada"
    assert por_clave["inventario"]["estado"] == "pendiente"
    assert por_clave["medicion"]["estado"] == "pendiente"


def test_bitacora_marca_en_curso_cuando_hay_avance_parcial(session):
    InventarioService.crear(session, {"codigo": "M3.1", "nombre": "Análisis"})
    por_clave = {f["clave"]: f for f in BitacoraService.obtener(session)["fases"]}

    # 1 proceso frente a una meta referencial de 4: avance parcial
    assert por_clave["inventario"]["estado"] == "en_curso"
    assert por_clave["inventario"]["evidencia"]["cantidad"] == 1


def test_bitacora_reporta_progreso_global(session):
    progreso = BitacoraService.obtener(session)["progreso"]
    assert progreso["total"] == 9
    assert progreso["completadas"] + progreso["en_curso"] + progreso["pendientes"] == 9

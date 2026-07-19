import pytest
from sqlmodel import Session, SQLModel, create_engine

from modules.anexos.application.anexos_service import AnexosService
from modules.fichas.application.errores import ErrorValidacion
from modules.fichas.application.ficha_proceso_service import FichaProcesoService
from modules.fichas.application.indicador_service import IndicadorService
from modules.fichas.application.inventario_service import InventarioService


@pytest.fixture
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


@pytest.fixture
def inventario(session):
    InventarioService.crear(session, {"codigo": "M3", "nombre": "Integración de sistemas"})
    InventarioService.crear(session, {
        "codigo": "M3.1", "nombre": "Análisis", "codigo_padre": "M3", "producto": "Informe",
    })
    return session


# ── Anexo 1 ───────────────────────────────────────────────────────────────────

def test_anexo1_aplana_el_arbol_en_preorden(session, inventario):
    anexo = AnexosService.anexo1(session)
    assert [f["codigo"] for f in anexo["filas"]] == ["M3", "M3.1"]
    # El hijo hereda su nivel del padre y se etiqueta según la jerarquía
    assert anexo["filas"][0]["nivel_etiqueta"] == "Macroproceso"
    assert anexo["filas"][1]["nivel_etiqueta"] == "Proceso"


def test_anexo1_cuenta_por_nivel(session, inventario):
    totales = AnexosService.anexo1(session)["totales"]
    assert totales["procesos"] == 2
    assert totales["por_nivel"]["Macroproceso"] == 1
    assert totales["por_nivel"]["Proceso"] == 1


def test_anexo1_sin_procesos_queda_vacio(session):
    anexo = AnexosService.anexo1(session)
    assert anexo["filas"] == []
    assert anexo["totales"]["procesos"] == 0


# ── Anexo 2 ───────────────────────────────────────────────────────────────────

def test_anexo2_rellena_el_sipoc_al_largo_de_la_lista_mayor(session, inventario):
    FichaProcesoService.guardar(session, "M3.1", {
        "proveedores": ["A", "B", "C"],
        "entradas": ["Solicitud"],
        "salidas": [],
        "receptores": ["Ciudadano"],
    })
    anexo = AnexosService.anexo2(session, "M3.1")
    # Tres filas porque 'proveedores' es la lista más larga; el resto se rellena
    assert len(anexo["sipoc"]) == 3
    assert anexo["sipoc"][0] == {
        "proveedores": "A", "entradas": "Solicitud", "salidas": "", "receptores": "Ciudadano",
    }
    assert anexo["sipoc"][2]["proveedores"] == "C"
    assert anexo["sipoc"][2]["entradas"] == ""


def test_anexo2_sin_ficha_se_emite_igual_marcado(session, inventario):
    anexo = AnexosService.anexo2(session, "M3.1")
    assert anexo["tiene_ficha"] is False
    # Se emite con una fila vacía para que la tabla del documento no colapse
    assert len(anexo["sipoc"]) == 1
    assert anexo["proceso"]["nombre"] == "Análisis"


def test_anexo2_proceso_inexistente_falla(session, inventario):
    with pytest.raises(Exception):
        AnexosService.anexo2(session, "NOEXISTE")


# ── Anexo 4 ───────────────────────────────────────────────────────────────────

def test_anexo4_incluye_indicadores_y_mediciones(session, inventario):
    ind = IndicadorService.crear(session, "M3.1", {
        "nombre": "% de análisis completos", "unidad": "%", "meta_final": 90,
    })
    IndicadorService.guardar_medicion(session, ind["id"], {
        "mes": "Enero", "numerador": 8, "denominador": 10, "resultado_esperado": 85,
    })

    anexo = AnexosService.anexo4(session, "M3.1")
    assert len(anexo["indicadores"]) == 1
    indicador = anexo["indicadores"][0]
    assert indicador["meta_final"] == 90
    assert len(indicador["mediciones"]) == 1
    assert indicador["mediciones"][0]["resultado_obtenido"] == 80.0


def test_anexo4_sin_indicadores_devuelve_lista_vacia(session, inventario):
    assert AnexosService.anexo4(session, "M3.1")["indicadores"] == []


def test_anexo4_proceso_inexistente_falla(session, inventario):
    with pytest.raises(ErrorValidacion):
        AnexosService.anexo4(session, "M9.9")


# ── Índice ────────────────────────────────────────────────────────────────────

def test_indice_reporta_completitud_por_anexo(session, inventario):
    FichaProcesoService.guardar(session, "M3.1", {"dueno": "Jefe"})
    IndicadorService.crear(session, "M3.1", {"nombre": "Ind"})

    indice = AnexosService.indice(session)
    por_numero = {a["numero"]: a for a in indice["anexos"]}

    assert indice["total_procesos"] == 2
    # 1 de 2 procesos tiene ficha e indicadores; el macroproceso M3 no
    assert por_numero[2]["completos"] == 1
    assert por_numero[4]["completos"] == 1
    assert all(a["disponible"] for a in indice["anexos"])


def test_indice_sin_datos_marca_anexos_no_disponibles(session):
    indice = AnexosService.indice(session)
    assert indice["total_procesos"] == 0
    assert not any(a["disponible"] for a in indice["anexos"])

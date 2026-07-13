import pytest
from sqlmodel import Session, SQLModel, create_engine

from modules.fichas.application.errores import ErrorNoEncontrado, ErrorValidacion
from modules.fichas.application.indicador_service import IndicadorService
from modules.fichas.application.inventario_service import InventarioService
from modules.fichas.application.lectura_bd import LecturaBD


@pytest.fixture
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


@pytest.fixture
def proceso(session):
    return InventarioService.crear(session, {"codigo": "M3.1", "nombre": "Análisis"})


def test_crear_indicador(session, proceso):
    data = IndicadorService.crear(session, "M3.1", {
        "nombre": "% solicitudes atendidas", "tipo": "eficacia",
        "sentido": "Ascendente", "unidad": "%", "meta_final": 90,
    })
    assert data["id"] is not None
    assert data["nombre"] == "% solicitudes atendidas"
    assert data["es_descendente"] is False
    assert data["mediciones"] == []


def test_nombre_obligatorio(session, proceso):
    with pytest.raises(ErrorValidacion):
        IndicadorService.crear(session, "M3.1", {"nombre": "  "})


def test_proceso_inexistente(session):
    with pytest.raises(ErrorNoEncontrado):
        IndicadorService.crear(session, "M9.9", {"nombre": "X"})


def test_medicion_deriva_obtenido_y_semaforo(session, proceso):
    ind = IndicadorService.crear(session, "M3.1", {"nombre": "Ind", "unidad": "%", "meta_final": 90})
    data = IndicadorService.guardar_medicion(session, ind["id"], {
        "anio": 2025, "mes": "enero", "numerador": 8, "denominador": 10, "resultado_esperado": 100,
    })
    fila = data["mediciones"][0]
    assert fila["resultado_obtenido"] == 80.0     # 8/10 * 100
    assert fila["avance_t1"] == 80.0              # 80/100 * 100
    assert fila["semaforo"] == "Amarillo"


def test_medicion_upsert_no_duplica(session, proceso):
    ind = IndicadorService.crear(session, "M3.1", {"nombre": "Ind"})
    IndicadorService.guardar_medicion(session, ind["id"], {"anio": 2025, "mes": "Enero", "numerador": 5, "denominador": 10})
    data = IndicadorService.guardar_medicion(session, ind["id"], {"anio": 2025, "mes": "enero", "numerador": 9, "denominador": 10})
    assert len(data["mediciones"]) == 1
    assert data["mediciones"][0]["resultado_obtenido"] == 90.0


def test_mes_invalido_falla(session, proceso):
    ind = IndicadorService.crear(session, "M3.1", {"nombre": "Ind"})
    with pytest.raises(ErrorValidacion, match="Mes"):
        IndicadorService.guardar_medicion(session, ind["id"], {"mes": "Trimestre"})


def test_eliminar_indicador_soft_delete(session, proceso):
    ind = IndicadorService.crear(session, "M3.1", {"nombre": "Ind"})
    IndicadorService.eliminar(session, ind["id"])
    assert IndicadorService.listar(session, "M3.1") == []


def test_editar_meta_y_sentido_se_refleja_en_lectura_bd(session, proceso):
    ind = IndicadorService.crear(session, "M3.1", {
        "nombre": "Tiempo de atención", "sentido": "Ascendente", "unidad": "días", "meta_final": 90,
    })
    IndicadorService.guardar_medicion(session, ind["id"], {
        "mes": "Enero", "resultado_obtenido": 20, "resultado_esperado": 15,
    })

    # Ascendente: 20 vs 15 esperado → supera lo esperado → 100
    registros = LecturaBD.construir_registros(session)
    assert registros[0]["es_descendente"] is False

    # Cambiar a Descendente (menor es mejor): la lectura para el dashboard cambia
    IndicadorService.actualizar(session, ind["id"], {"sentido": "Descendente"})
    registros = LecturaBD.construir_registros(session)
    assert registros[0]["es_descendente"] is True
    assert registros[0]["meta_final"] == 90

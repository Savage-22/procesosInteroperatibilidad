import pytest
from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine

from modules.fichas.application.errores import ErrorNoEncontrado
from modules.fichas.application.ficha_proceso_service import FichaProcesoService
from modules.fichas.application.inventario_service import InventarioService


@pytest.fixture
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


@pytest.fixture
def proceso(session):
    return InventarioService.crear(session, {"codigo": "M3.1", "nombre": "Análisis"})


def test_obtener_sin_ficha_devuelve_vacia(session, proceso):
    data = FichaProcesoService.obtener(session, "M3.1")
    assert data["tiene_ficha"] is False
    assert data["nombre_proceso"] == "Análisis"
    assert data["proveedores"] == []


def test_proceso_inexistente_falla(session):
    with pytest.raises(ErrorNoEncontrado):
        FichaProcesoService.obtener(session, "M9.9")


def test_guardar_crea_y_persiste_sipoc(session, proceso):
    data = FichaProcesoService.guardar(session, "m3.1", {
        "tipo": "misional",
        "dueno": "Jefe de TI",
        "proveedores": ["Área usuaria", "RENIEC"],
        "entradas": ["Solicitud"],
        "salidas": ["Especificación"],
        "receptores": ["Equipo de desarrollo"],
    })
    assert data["tiene_ficha"] is True
    assert data["dueno"] == "Jefe de TI"
    assert data["proveedores"] == ["Área usuaria", "RENIEC"]

    # Persistió y se relee
    recuperada = FichaProcesoService.obtener(session, "M3.1")
    assert recuperada["tipo"] == "misional"
    assert recuperada["salidas"] == ["Especificación"]


def test_guardar_es_upsert_no_duplica(session, proceso):
    FichaProcesoService.guardar(session, "M3.1", {"dueno": "A"})
    FichaProcesoService.guardar(session, "M3.1", {"dueno": "B"})
    data = FichaProcesoService.obtener(session, "M3.1")
    assert data["dueno"] == "B"


def test_guardar_descarta_filas_vacias_del_sipoc(session, proceso):
    data = FichaProcesoService.guardar(session, "M3.1", {
        "proveedores": ["RENIEC", "  ", "", "SUNAT"],
    })
    assert data["proveedores"] == ["RENIEC", "SUNAT"]


def test_sincronizar_columnas_agrega_faltantes():
    # Simula una BD vieja: crea ficha_proceso sin la columna 'actividades'
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    with engine.begin() as conn:
        conn.execute(text(
            "CREATE TABLE ficha_proceso (id INTEGER PRIMARY KEY, proceso_id INTEGER)"
        ))

    from sqlalchemy import inspect
    import modules.fichas.infrastructure.database as db

    # Apunta el módulo al engine de prueba y corre la sincronización
    original = db.engine
    db.engine = engine
    try:
        SQLModel.metadata.create_all(engine)
        db._sincronizar_columnas()
        columnas = {c["name"] for c in inspect(engine).get_columns("ficha_proceso")}
        assert "actividades" in columnas
        assert "objetivo_estrategico" in columnas
    finally:
        db.engine = original

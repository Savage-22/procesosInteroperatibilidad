import pytest
from sqlmodel import Session, SQLModel, create_engine

from modules.fichas.application.errores import ErrorValidacion
from modules.fichas.application.inventario_service import InventarioService


@pytest.fixture
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


def test_arbol_vacio_reporta_sin_datos(session):
    arbol = InventarioService.arbol(session)
    assert arbol["tiene_datos"] is False
    assert arbol["arbol"] == []


def test_crear_macroproceso_es_nivel_0(session):
    proceso = InventarioService.crear(session, {"codigo": "M3", "nombre": "Integración"})
    assert proceso.nivel == 0
    assert proceso.codigo_padre is None


def test_crear_hijo_hereda_nivel_del_padre(session):
    InventarioService.crear(session, {"codigo": "M3", "nombre": "Integración"})
    hijo = InventarioService.crear(session, {
        "codigo": "M3.1", "nombre": "Análisis", "codigo_padre": "M3"
    })
    assert hijo.nivel == 1
    nieto = InventarioService.crear(session, {
        "codigo": "M3.1.1", "nombre": "Sub", "codigo_padre": "M3.1"
    })
    assert nieto.nivel == 2


def test_crear_con_padre_inexistente_falla(session):
    with pytest.raises(ErrorValidacion, match="padre"):
        InventarioService.crear(session, {
            "codigo": "M3.1", "nombre": "Análisis", "codigo_padre": "M9"
        })


def test_codigo_duplicado_falla(session):
    InventarioService.crear(session, {"codigo": "M3", "nombre": "Integración"})
    with pytest.raises(ErrorValidacion, match="Ya existe"):
        InventarioService.crear(session, {"codigo": "M3", "nombre": "Otro"})


def test_codigo_obligatorio(session):
    with pytest.raises(ErrorValidacion):
        InventarioService.crear(session, {"codigo": "", "nombre": "X"})


def test_arbol_anida_hijos_bajo_su_padre(session):
    InventarioService.crear(session, {"codigo": "M3", "nombre": "Integración"})
    InventarioService.crear(session, {"codigo": "M3.1", "nombre": "Análisis", "codigo_padre": "M3"})
    InventarioService.crear(session, {"codigo": "M3.2", "nombre": "Desarrollo", "codigo_padre": "M3"})

    arbol = InventarioService.arbol(session)
    assert arbol["tiene_datos"] is True
    assert len(arbol["arbol"]) == 1
    raiz = arbol["arbol"][0]
    assert raiz["codigo"] == "M3"
    assert [h["codigo"] for h in raiz["hijos"]] == ["M3.1", "M3.2"]


def test_actualizar_cambia_nombre(session):
    p = InventarioService.crear(session, {"codigo": "M3", "nombre": "Integración"})
    actualizado = InventarioService.actualizar(session, p.id, {"nombre": "Integración de sistemas"})
    assert actualizado.nombre == "Integración de sistemas"


def test_no_puede_ser_su_propio_padre(session):
    p = InventarioService.crear(session, {"codigo": "M3", "nombre": "Integración"})
    with pytest.raises(ErrorValidacion, match="propio padre"):
        InventarioService.actualizar(session, p.id, {"codigo_padre": "M3"})


def test_eliminar_con_hijos_activos_falla(session):
    InventarioService.crear(session, {"codigo": "M3", "nombre": "Integración"})
    padre = InventarioService._buscar_por_codigo(session, 1, "M3")
    InventarioService.crear(session, {"codigo": "M3.1", "nombre": "Análisis", "codigo_padre": "M3"})
    with pytest.raises(ErrorValidacion, match="subprocesos"):
        InventarioService.eliminar(session, padre.id)


def test_eliminar_es_soft_delete(session):
    p = InventarioService.crear(session, {"codigo": "M3", "nombre": "Integración"})
    InventarioService.eliminar(session, p.id)
    arbol = InventarioService.arbol(session)
    assert arbol["tiene_datos"] is False


def test_cargar_plantilla_crea_16_procesos_idempotente(session):
    creados = InventarioService.cargar_plantilla(session)
    assert creados == 16  # 4 macroprocesos + 12 procesos
    # Reejecutar no duplica
    creados_2 = InventarioService.cargar_plantilla(session)
    assert creados_2 == 0
    arbol = InventarioService.arbol(session)
    assert len(arbol["arbol"]) == 4
    assert all(len(macro["hijos"]) == 3 for macro in arbol["arbol"])

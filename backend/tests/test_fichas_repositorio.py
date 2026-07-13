import pytest
from sqlmodel import Session, SQLModel, create_engine

from modules.fichas.application.repositorio import Repositorio
from modules.fichas.infrastructure.models import (
    FichaIndicador,
    FichaProceso,
    Medicion,
    Organizacion,
    Proceso,
)


@pytest.fixture
def session():
    # BD en memoria por test: rápida y aislada
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


@pytest.fixture
def organizacion(session):
    return Repositorio.crear(session, Organizacion(nombre="Municipalidad X", sector="Público"))


def test_crear_asigna_id(session):
    org = Repositorio.crear(session, Organizacion(nombre="Entidad A"))
    assert org.id is not None
    assert org.estado_onboarding == "pendiente"
    assert org.activo is True


def test_obtener_devuelve_el_mismo_registro(session, organizacion):
    encontrado = Repositorio.obtener(session, Organizacion, organizacion.id)
    assert encontrado is not None
    assert encontrado.nombre == "Municipalidad X"


def test_obtener_inexistente_devuelve_none(session):
    assert Repositorio.obtener(session, Organizacion, 999) is None


def test_actualizar_cambia_campos_y_no_toca_id(session, organizacion):
    id_original = organizacion.id
    actualizado = Repositorio.actualizar(
        session, organizacion, {"id": 123, "estado_onboarding": "completado"}
    )
    assert actualizado.id == id_original
    assert actualizado.estado_onboarding == "completado"


def test_desactivar_es_soft_delete(session, organizacion):
    Repositorio.desactivar(session, organizacion)
    # Sigue en la BD pero marcada como inactiva
    assert Repositorio.obtener(session, Organizacion, organizacion.id).activo is False


def test_listar_solo_activos_omite_desactivados(session):
    a = Repositorio.crear(session, Organizacion(nombre="Activa"))
    b = Repositorio.crear(session, Organizacion(nombre="Inactiva"))
    Repositorio.desactivar(session, b)

    activos = Repositorio.listar(session, Organizacion, solo_activos=True)
    todos = Repositorio.listar(session, Organizacion, solo_activos=False)

    assert {o.id for o in activos} == {a.id}
    assert {o.id for o in todos} == {a.id, b.id}


def test_filtrar_por_campo(session, organizacion):
    Repositorio.crear(session, Proceso(
        organizacion_id=organizacion.id, codigo="M3.1", nivel=1, nombre="Diseño"
    ))
    Repositorio.crear(session, Proceso(
        organizacion_id=organizacion.id, codigo="M3.2", nivel=1, nombre="Construcción"
    ))
    encontrados = Repositorio.filtrar(session, Proceso, codigo="M3.1")
    assert len(encontrados) == 1
    assert encontrados[0].nombre == "Diseño"


def test_sipoc_guarda_listas_como_json(session, organizacion):
    proceso = Repositorio.crear(session, Proceso(
        organizacion_id=organizacion.id, codigo="M3", nivel=0, nombre="Integración"
    ))
    ficha = Repositorio.crear(session, FichaProceso(
        proceso_id=proceso.id,
        dueno="Jefe TI",
        proveedores=["Área usuaria", "RENIEC"],
        entradas=["Solicitud", "DNI"],
    ))
    recuperada = Repositorio.obtener(session, FichaProceso, ficha.id)
    assert recuperada.proveedores == ["Área usuaria", "RENIEC"]
    assert recuperada.entradas == ["Solicitud", "DNI"]
    assert recuperada.salidas == []


def test_borrado_de_proceso_cascada_a_indicadores_y_mediciones(session, organizacion):
    proceso = Repositorio.crear(session, Proceso(
        organizacion_id=organizacion.id, codigo="M3.1", nivel=1, nombre="Diseño"
    ))
    indicador = Repositorio.crear(session, FichaIndicador(
        proceso_id=proceso.id, nombre="% solicitudes atendidas", tipo="eficacia"
    ))
    Repositorio.crear(session, Medicion(
        indicador_id=indicador.id, mes="Enero", numerador=8, denominador=10
    ))

    Repositorio.eliminar(session, proceso)

    assert Repositorio.listar(session, FichaIndicador, solo_activos=False) == []
    assert Repositorio.listar(session, Medicion) == []


def test_borrado_de_organizacion_cascada_a_procesos(session, organizacion):
    Repositorio.crear(session, Proceso(
        organizacion_id=organizacion.id, codigo="M3", nivel=0, nombre="Integración"
    ))
    Repositorio.eliminar(session, organizacion)
    assert Repositorio.listar(session, Proceso, solo_activos=False) == []

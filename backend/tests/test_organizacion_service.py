import pytest
from sqlmodel import Session, SQLModel, create_engine

from modules.fichas.application.ficha_proceso_service import FichaProcesoService
from modules.fichas.application.indicador_service import IndicadorService
from modules.fichas.application.inventario_service import InventarioService
from modules.fichas.application.organizacion_service import OrganizacionService


@pytest.fixture
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


def test_resumen_inicial_sugiere_paso_1(session):
    resumen = OrganizacionService.resumen(session)
    assert resumen["tiene_datos"] is False
    assert resumen["conteos"] == {"procesos": 0, "con_ficha": 0, "indicadores": 0, "mediciones": 0}
    assert resumen["paso_sugerido"] == 1


def test_actualizar_nombre_avanza_a_paso_2(session):
    OrganizacionService.actualizar(session, {"nombre": "Municipalidad de Lima", "sector": "Gobierno local"})
    resumen = OrganizacionService.resumen(session)
    assert resumen["nombre"] == "Municipalidad de Lima"
    assert resumen["sector"] == "Gobierno local"
    assert resumen["paso_sugerido"] == 2


def test_paso_sugerido_avanza_con_el_progreso(session):
    OrganizacionService.actualizar(session, {"nombre": "Entidad X"})
    InventarioService.crear(session, {"codigo": "M3.1", "nombre": "Análisis"})
    assert OrganizacionService.resumen(session)["paso_sugerido"] == 3  # falta indicador

    ind = IndicadorService.crear(session, "M3.1", {"nombre": "Ind"})
    assert OrganizacionService.resumen(session)["paso_sugerido"] == 4  # falta medición

    IndicadorService.guardar_medicion(session, ind["id"], {"mes": "Enero", "numerador": 5, "denominador": 10})
    assert OrganizacionService.resumen(session)["paso_sugerido"] == 5


def test_conteo_con_ficha(session):
    OrganizacionService.actualizar(session, {"nombre": "Entidad X"})
    InventarioService.crear(session, {"codigo": "M3.1", "nombre": "Análisis"})
    FichaProcesoService.guardar(session, "M3.1", {"dueno": "Jefe"})
    resumen = OrganizacionService.resumen(session)
    assert resumen["conteos"]["con_ficha"] == 1
    assert resumen["conteos"]["procesos"] == 1


def test_completado_fija_paso_5(session):
    OrganizacionService.actualizar(session, {"estado_onboarding": "completado"})
    assert OrganizacionService.resumen(session)["paso_sugerido"] == 5


def test_estado_invalido_se_ignora(session):
    OrganizacionService.actualizar(session, {"estado_onboarding": "cualquiera"})
    assert OrganizacionService.resumen(session)["estado_onboarding"] == "pendiente"

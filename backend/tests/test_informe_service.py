import pytest
from sqlmodel import Session, SQLModel, create_engine

from modules.analisis.application.analisis_service import clave_seccion
from modules.analisis.application.informe_service import InformeService


@pytest.fixture
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


def _informe(titulo="Estado institucional"):
    return {
        "titulo": titulo,
        "resumen_ejecutivo": "La entidad avanza según lo previsto.",
        "secciones": [{"titulo": "Seguimiento", "contenido": "Todo en verde."}],
        "conclusion": "Sin observaciones.",
    }


def test_sin_informe_guardado_devuelve_none(session):
    assert InformeService.obtener(session, "ejecutivo") is None


def test_guardar_y_recuperar_conserva_el_contenido(session):
    InformeService.guardar(session, "ejecutivo", _informe())
    guardado = InformeService.obtener(session, "ejecutivo")
    assert guardado["titulo"] == "Estado institucional"
    assert guardado["contenido"]["conclusion"] == "Sin observaciones."
    assert guardado["generado_en"]


def test_regenerar_reemplaza_en_vez_de_acumular(session):
    InformeService.guardar(session, "ejecutivo", _informe("Primera versión"))
    InformeService.guardar(session, "ejecutivo", _informe("Segunda versión"))
    assert InformeService.obtener(session, "ejecutivo")["titulo"] == "Segunda versión"
    assert len(InformeService.listar(session, "ejecutivo")) == 1


def test_cada_alcance_guarda_su_propio_informe(session):
    InformeService.guardar(session, "modulo", _informe("Informe M1"), alcance="M1")
    InformeService.guardar(session, "modulo", _informe("Informe M2"), alcance="M2")
    assert InformeService.obtener(session, "modulo", "M1")["titulo"] == "Informe M1"
    assert InformeService.obtener(session, "modulo", "M2")["titulo"] == "Informe M2"
    assert len(InformeService.listar(session, "modulo")) == 2


def test_listar_omite_el_contenido(session):
    InformeService.guardar(session, "ejecutivo", _informe())
    assert "contenido" not in InformeService.listar(session)[0]


def test_eliminar_borra_solo_ese_alcance(session):
    InformeService.guardar(session, "modulo", _informe(), alcance="M1")
    InformeService.guardar(session, "modulo", _informe(), alcance="M2")
    assert InformeService.eliminar(session, "modulo", "M1") is True
    assert InformeService.obtener(session, "modulo", "M1") is None
    assert InformeService.obtener(session, "modulo", "M2") is not None


def test_eliminar_inexistente_no_falla(session):
    assert InformeService.eliminar(session, "ejecutivo") is False


def test_clave_seccion_separa_proceso_y_periodo(session):
    assert clave_seccion("mejora", "M1.1", None) != clave_seccion("mejora", "M2.3", None)
    assert clave_seccion("tablero", None, "S1") != clave_seccion("tablero", None, "S2")

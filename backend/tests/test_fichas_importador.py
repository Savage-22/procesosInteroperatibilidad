import os

import pytest
from sqlmodel import Session, SQLModel, create_engine, func, select

from modules.fichas.application.importador import ImportadorExcel
from modules.fichas.application.lectura_bd import LecturaBD
from modules.fichas.infrastructure.models import FichaIndicador, Medicion, Proceso
from modules.procesos.infrastructure.excel_reader import parsear_excel

EXCEL_EJEMPLO = os.path.join(
    os.path.dirname(__file__), "..", "..", "datos_estandarizados.xlsx"
)

# Campos que el dashboard/Pareto/objetivos consumen y deben sobrevivir al viaje
# Excel → BD → reconstrucción sin alterarse
CAMPOS_CLAVE = [
    "proceso", "sentido", "unidad", "meta_texto", "meta_final",
    "numerador", "denominador", "resultado_esperado", "resultado_obtenido",
    "diferencia", "modulo", "es_descendente", "relevancia",
    "objetivo_estrategico", "accion_estrategica",
]


@pytest.fixture
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


def _por_clave(registros):
    return {(r["codigo_proceso"], r["anio"], r["mes"]): r for r in registros}


def test_reconstruccion_bd_equivale_al_excel(session):
    registros_excel, _ = parsear_excel(EXCEL_EJEMPLO)
    assert registros_excel, "El Excel de ejemplo debería tener registros"

    ImportadorExcel.importar(session, registros_excel)
    registros_bd = LecturaBD.construir_registros(session)

    excel = _por_clave(registros_excel)
    bd = _por_clave(registros_bd)

    assert bd.keys() == excel.keys()
    for clave, r_excel in excel.items():
        r_bd = bd[clave]
        for campo in CAMPOS_CLAVE:
            assert r_bd[campo] == r_excel[campo], f"{clave} · campo '{campo}'"


def test_infiere_inventario_con_macroprocesos(session):
    registros_excel, _ = parsear_excel(EXCEL_EJEMPLO)
    ImportadorExcel.importar(session, registros_excel)

    procesos = session.exec(select(Proceso)).all()
    niveles = {p.codigo: p.nivel for p in procesos}

    # Cada M#.# de nivel 1 debe tener su macroproceso M# de nivel 0 como padre
    hojas = [p for p in procesos if p.nivel == 1]
    assert hojas, "Debería haber procesos hoja importados"
    for hoja in hojas:
        assert hoja.codigo_padre in niveles
        assert niveles[hoja.codigo_padre] == 0


def test_upsert_es_idempotente(session):
    registros_excel, _ = parsear_excel(EXCEL_EJEMPLO)

    ImportadorExcel.importar(session, registros_excel)
    conteos_1 = {
        "procesos": session.exec(select(func.count()).select_from(Proceso)).one(),
        "indicadores": session.exec(select(func.count()).select_from(FichaIndicador)).one(),
        "mediciones": session.exec(select(func.count()).select_from(Medicion)).one(),
    }

    # Reimportar el mismo Excel no debe crear duplicados
    ImportadorExcel.importar(session, registros_excel)
    conteos_2 = {
        "procesos": session.exec(select(func.count()).select_from(Proceso)).one(),
        "indicadores": session.exec(select(func.count()).select_from(FichaIndicador)).one(),
        "mediciones": session.exec(select(func.count()).select_from(Medicion)).one(),
    }

    assert conteos_1 == conteos_2


def test_resumen_reporta_creaciones_y_luego_actualizaciones(session):
    registros_excel, _ = parsear_excel(EXCEL_EJEMPLO)

    primero = ImportadorExcel.importar(session, registros_excel)
    assert primero["mediciones"] > 0
    assert primero["actualizadas"] == 0

    segundo = ImportadorExcel.importar(session, registros_excel)
    assert segundo["mediciones"] == 0
    assert segundo["actualizadas"] == primero["mediciones"]

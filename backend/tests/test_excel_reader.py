from modules.procesos.infrastructure.excel_reader import (
    ExcelStore,
    _es_descendente,
    _extraer_modulo,
    _float_o_none,
    _int_o_none,
)


def test_es_descendente_con_simbolo():
    assert _es_descendente("≤ 20 días") is True
    assert _es_descendente("<= 20") is True
    assert _es_descendente("≥ 95%") is False


def test_extraer_modulo():
    assert _extraer_modulo("Módulo M2 — Trámites") == "M2"
    assert _extraer_modulo("sin módulo") == "?"


def test_float_o_none():
    assert _float_o_none("12.5") == 12.5
    assert _float_o_none("abc") is None
    assert _float_o_none(None) is None


def test_int_o_none():
    assert _int_o_none("2025.0") == 2025
    assert _int_o_none("x") is None


def test_cargar_archivo_inexistente_no_crashea(tmp_path):
    ExcelStore.cargar(str(tmp_path / "no_existe.xlsx"))
    assert ExcelStore.get_all() == []
    meta = ExcelStore.get_meta()
    assert any("no encontrado" in a for a in meta["advertencias"])
    assert meta["modulos_cargados"] == []

import pandas as pd

from modules.procesos.infrastructure.excel_reader import (
    ExcelStore,
    _buscar_encabezado,
    _float_o_none,
    _int_o_none,
    meta_texto,
    _normalizar,
)

ENCABEZADOS = [
    "CÓDIGO DE\nPROCESO", "PROCESO", "INDICADOR", "Sentido Indicador", "Unidad",
    "META\nFINAL", "AÑO", "MES", "NUMERADOR\n(cantidad)", "DENOMINADOR\n(cantidad)",
    "RESULTADO\nESPERADO (%)", "RESULTADO\nOBTENIDO (%)", "DIFERENCIA\n(pp)",
    "AVANCE T1\n(%)", "SEMÁFORO\nCEPLAN",
]


def _hoja_de_prueba(filas: list[list]) -> pd.DataFrame:
    titulo = ["DATOS ESTANDARIZADOS"] + [None] * (len(ENCABEZADOS) - 1)
    subtitulo = ["Semaforización CEPLAN"] + [None] * (len(ENCABEZADOS) - 1)
    return pd.DataFrame([titulo, subtitulo, ENCABEZADOS] + filas)


def _excel_de_prueba(tmp_path, hojas: dict[str, list[list]]) -> str:
    ruta = str(tmp_path / "datos.xlsx")
    with pd.ExcelWriter(ruta) as writer:
        for nombre, filas in hojas.items():
            _hoja_de_prueba(filas).to_excel(writer, sheet_name=nombre, header=False, index=False)
    return ruta


def test_normalizar():
    assert _normalizar("CÓDIGO DE\nPROCESO") == "codigo de proceso"
    assert _normalizar("  AÑO ") == "ano"


def test_buscar_encabezado_encuentra_fila_y_columnas():
    df = _hoja_de_prueba([])
    fila, col = _buscar_encabezado(df)
    assert fila == 2
    assert col["codigo_proceso"] == 0
    assert col["sentido"] == 3
    assert col["mes"] == 7
    assert col["resultado_esperado"] == 10


def test_buscar_encabezado_acepta_tipo_indicador():
    encabezados = list(ENCABEZADOS)
    encabezados[3] = "Tipo Indicador"
    df = pd.DataFrame([encabezados])
    _, col = _buscar_encabezado(df)
    assert col["sentido"] == 3


def test_buscar_encabezado_sin_encabezados():
    df = pd.DataFrame([["solo", "texto"], ["sin", "datos"]])
    assert _buscar_encabezado(df) is None


def test_meta_texto():
    assert meta_texto(90.0, "%", False) == "≥ 90 %"
    assert meta_texto(20.0, "días", True) == "≤ 20 días"
    assert meta_texto(None, "%", False) == ""


def test_float_o_none():
    assert _float_o_none("12.5") == 12.5
    assert _float_o_none("abc") is None
    assert _float_o_none(None) is None
    assert _float_o_none(float("nan")) is None


def test_int_o_none():
    assert _int_o_none("2025.0") == 2025
    assert _int_o_none("x") is None


def test_cargar_archivo_inexistente_no_crashea(tmp_path):
    ExcelStore.cargar(str(tmp_path / "no_existe.xlsx"))
    assert ExcelStore.get_all() == []
    meta = ExcelStore.get_meta()
    assert any("no encontrado" in a for a in meta["advertencias"])
    assert meta["modulos_cargados"] == []


def test_cargar_formato_nuevo(tmp_path):
    ruta = _excel_de_prueba(tmp_path, {
        "P1 - Equipo": [
            # El obtenido (16) difiere de num/den a propósito: debe ganar el cálculo
            ["M1.1", "Proceso A", "Ind A", "Ascendente", "%", 90, 2026, "Enero",
             4, 25, 15, 99, 1, 100, "Verde"],
            ["M1.1", "Proceso A", "Ind A", "Ascendente", "%", 90, 2026, "Febrero",
             7, 26, 25, 27, 2, 100, "Verde"],
            # Filas auxiliares que deben ignorarse
            [None] * 15,
            ["FÓRMULAS APLICADAS"] + [None] * 14,
            ["M1", "nota", None, None, None, None, "NUMERADOR", "DENOMINADOR",
             None, None, None, None, None, None, None],
            ["M1.1.1", "subtabla", None, None, None, None, 4, 24,
             None, None, None, None, None, None, None],
        ],
        "P4 - Equipo": [
            ["M4.1", "Proceso D", "Ind D", "Descendente", "días", 20, 2026, "Enero",
             None, None, 25, 30, None, None, None],
            # Unidad no porcentual con conteos: obtenido = promedio (555/30 días)
            ["M4.1", "Proceso D", "Ind D", "Descendente", "días", 20, 2026, "Febrero",
             555, 30, 22, 99, None, None, None],
        ],
    })

    ExcelStore.cargar(ruta)
    registros = ExcelStore.get_all()

    # Solo las 4 filas de datos reales; las auxiliares se descartan
    assert len(registros) == 4

    enero = registros[0]
    assert enero["modulo"] == "M1"
    # Obtenido calculado desde numerador/denominador, no la columna del Excel
    assert enero["resultado_obtenido"] == 16.0
    assert enero["diferencia"] == 1.0
    assert enero["es_descendente"] is False
    assert enero["meta_texto"] == "≥ 90 %"

    m4 = registros[2]
    assert m4["modulo"] == "M4"
    assert m4["es_descendente"] is True
    # Sin numerador/denominador se respeta la columna obtenido del Excel
    assert m4["resultado_obtenido"] == 30.0

    # Unidad "días": el obtenido es el promedio total/casos, no un porcentaje
    assert registros[3]["resultado_obtenido"] == 18.5

    meta = ExcelStore.get_meta()
    assert meta["modulos_cargados"] == ["M1", "M4"]
    advertencias_m4 = [a for a in meta["advertencias"] if "M4" in a]
    assert advertencias_m4 == []


def test_cargar_hoja_sin_encabezados_genera_advertencia(tmp_path):
    ruta = str(tmp_path / "datos.xlsx")
    pd.DataFrame([["notas sueltas"]]).to_excel(ruta, header=False, index=False)

    ExcelStore.cargar(ruta)
    assert ExcelStore.get_all() == []
    assert any("encabezados" in a for a in ExcelStore.get_meta()["advertencias"])

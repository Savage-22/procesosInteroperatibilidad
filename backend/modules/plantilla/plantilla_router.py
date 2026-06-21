import io

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

router = APIRouter(prefix="/api")

_AZUL = "1E3654"
_AMARILLO = "F4D100"
_GRIS_CLARO = "F2F4F7"
_VERDE_CLARO = "D1FADF"
_ROJO_CLARO = "FFE8E8"

_COLUMNAS = [
    ("Codigo",                  "Código del proceso. Patrón: M<módulo>.<número>  Ej: M1.1, M3.2"),
    ("Proceso",                 "Nombre descriptivo del proceso o servicio que se mide."),
    ("Indicador",               "Descripción del indicador que mide el proceso."),
    ("Objetivo Estrategico",    "(Opcional) Objetivo estratégico al que pertenece este proceso. Ej: OE1 — Mejorar atención al ciudadano"),
    ("Accion Estrategica",      "(Opcional) Acción estratégica dentro del objetivo. Ej: A1.1 — Reducir tiempo de espera"),
    ("Relevancia",         "Importancia del indicador dentro del módulo: 1=Muy relevante  2=Relevante  3=Menos relevante"),
    ("Sentido",            "Dirección del indicador: Ascendente (mayor es mejor)  o  Descendente (menor es mejor, ej. tiempo de espera)."),
    ("Unidad",             "Unidad de medida del resultado. Ejemplos: %  días  horas  atenciones. Usar % o dejar vacío para porcentajes."),
    ("Meta Final",         "Valor meta a alcanzar al cierre del año (diciembre)."),
    ("Año",                "Año al que corresponde el registro. Ej: 2025"),
    ("Mes",                "Mes del registro. Valores válidos: Enero Febrero Marzo Abril Mayo Junio Julio Agosto Septiembre Octubre Noviembre Diciembre"),
    ("Numerador",          "Valor del numerador para calcular el resultado (ej. personas atendidas). Dejar vacío si se usa Resultado Obtenido directamente."),
    ("Denominador",        "Valor del denominador (ej. total de personas). El sistema calcula Resultado = Numerador / Denominador × 100 para unidades porcentuales."),
    ("Resultado Esperado", "Valor que se esperaba obtener en este mes (meta mensual)."),
    ("Resultado Obtenido", "Valor obtenido en el mes. Solo completar si NO se usan Numerador/Denominador. Si ambos están presentes, este campo se ignora."),
]

_EJEMPLOS = [
    # Módulo M1 — Ascendente, porcentaje, con numerador/denominador
    ("M1.1", "Atención oportuna de trámites",   "Porcentaje de trámites resueltos en plazo",       "OE1 — Mejorar atención al ciudadano", "A1.1 — Atención de trámites",   1, "Ascendente",   "%",    95,  2025, "Enero",   850,  1000, 80,  ""),
    ("M1.1", "Atención oportuna de trámites",   "Porcentaje de trámites resueltos en plazo",       "OE1 — Mejorar atención al ciudadano", "A1.1 — Atención de trámites",   1, "Ascendente",   "%",    95,  2025, "Febrero", 900,  1000, 83,  ""),
    ("M1.1", "Atención oportuna de trámites",   "Porcentaje de trámites resueltos en plazo",       "OE1 — Mejorar atención al ciudadano", "A1.1 — Atención de trámites",   1, "Ascendente",   "%",    95,  2025, "Marzo",   920,  1000, 86,  ""),
    # Módulo M2 — Descendente, días, sin numerador/denominador
    ("M2.1", "Reducción de tiempo de espera",   "Tiempo promedio de espera del ciudadano (días)",  "OE1 — Mejorar atención al ciudadano", "A1.2 — Reducir tiempo de espera", 1, "Descendente", "días", 20,  2025, "Enero",   "",   "",   22,  25),
    ("M2.1", "Reducción de tiempo de espera",   "Tiempo promedio de espera del ciudadano (días)",  "OE1 — Mejorar atención al ciudadano", "A1.2 — Reducir tiempo de espera", 1, "Descendente", "días", 20,  2025, "Febrero", "",   "",   22,  24),
    ("M2.1", "Reducción de tiempo de espera",   "Tiempo promedio de espera del ciudadano (días)",  "OE1 — Mejorar atención al ciudadano", "A1.2 — Reducir tiempo de espera", 1, "Descendente", "días", 20,  2025, "Marzo",   "",   "",   21,  23),
    # Módulo M3 — Ascendente, dos indicadores (relevancia 1 y 2)
    ("M3.1", "Mejora en calidad del servicio",  "Índice de satisfacción ciudadana (%)",            "OE2 — Fortalecer calidad",            "A2.1 — Satisfacción ciudadana",  1, "Ascendente",   "%",    85,  2025, "Enero",   170,  200,  70,  ""),
    ("M3.1", "Mejora en calidad del servicio",  "Índice de satisfacción ciudadana (%)",            "OE2 — Fortalecer calidad",            "A2.1 — Satisfacción ciudadana",  1, "Ascendente",   "%",    85,  2025, "Febrero", 178,  200,  73,  ""),
    ("M3.2", "Mejora en calidad del servicio",  "Porcentaje de reclamos resueltos (%)",            "OE2 — Fortalecer calidad",            "A2.1 — Satisfacción ciudadana",  2, "Ascendente",   "%",    90,  2025, "Enero",   108,  120,  88,  ""),
    ("M3.2", "Mejora en calidad del servicio",  "Porcentaje de reclamos resueltos (%)",            "OE2 — Fortalecer calidad",            "A2.1 — Satisfacción ciudadana",  2, "Ascendente",   "%",    90,  2025, "Febrero", 112,  120,  89,  ""),
    # Módulo M4 — Ascendente, porcentaje de implementación
    ("M4.1", "Implementación del plan operativo", "Porcentaje de actividades implementadas (%)",   "OE2 — Fortalecer calidad",            "A2.2 — Plan operativo",          1, "Ascendente",   "%",    100, 2025, "Enero",   60,   100,  75,  ""),
    ("M4.1", "Implementación del plan operativo", "Porcentaje de actividades implementadas (%)",   "OE2 — Fortalecer calidad",            "A2.2 — Plan operativo",          1, "Ascendente",   "%",    100, 2025, "Febrero", 70,   100,  78,  ""),
    ("M4.1", "Implementación del plan operativo", "Porcentaje de actividades implementadas (%)",   "OE2 — Fortalecer calidad",            "A2.2 — Plan operativo",          1, "Ascendente",   "%",    100, 2025, "Marzo",   82,   100,  82,  ""),
]

_ENCABEZADOS = [c[0] for c in _COLUMNAS]


def _borde_fino():
    lado = Side(style="thin", color="CCCCCC")
    return Border(left=lado, right=lado, top=lado, bottom=lado)


def _hoja_datos(wb: Workbook) -> None:
    ws = wb.active
    ws.title = "Datos"

    fill_header  = PatternFill("solid", fgColor=_AZUL)
    fill_ejemplo = PatternFill("solid", fgColor=_GRIS_CLARO)
    font_header  = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
    font_ejemplo = Font(name="Calibri", italic=True, color="555555", size=10)
    font_normal  = Font(name="Calibri", size=10)
    alin_centro  = Alignment(horizontal="center", vertical="center", wrap_text=True)
    alin_izq     = Alignment(horizontal="left",   vertical="center", wrap_text=True)

    # — Fila 1: encabezados —
    for col_idx, nombre in enumerate(_ENCABEZADOS, start=1):
        cell = ws.cell(row=1, column=col_idx, value=nombre)
        cell.fill   = fill_header
        cell.font   = font_header
        cell.border = _borde_fino()
        cell.alignment = alin_centro

    # — Filas de ejemplo —
    for row_idx, fila in enumerate(_EJEMPLOS, start=2):
        for col_idx, valor in enumerate(fila, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=valor if valor != "" else None)
            cell.fill      = fill_ejemplo
            cell.font      = font_ejemplo
            cell.border    = _borde_fino()
            cell.alignment = alin_izq

    # — Fila vacía para que el usuario empiece a llenar —
    fila_nueva = len(_EJEMPLOS) + 2
    for col_idx in range(1, len(_ENCABEZADOS) + 1):
        cell = ws.cell(row=fila_nueva, column=col_idx)
        cell.border    = _borde_fino()
        cell.font      = font_normal
        cell.alignment = alin_izq

    # — Anchos de columna —
    anchos = [10, 32, 38, 30, 28, 11, 13, 8, 12, 6, 13, 13, 13, 18, 18]
    for i, ancho in enumerate(anchos, start=1):
        ws.column_dimensions[get_column_letter(i)].width = ancho

    ws.row_dimensions[1].height = 30
    ws.freeze_panes = "A2"


def _hoja_instrucciones(wb: Workbook) -> None:
    ws = wb.create_sheet("Instrucciones")

    fill_titulo  = PatternFill("solid", fgColor=_AZUL)
    fill_col     = PatternFill("solid", fgColor="DCE8F5")
    fill_nota    = PatternFill("solid", fgColor="FFFDE7")
    fill_verde   = PatternFill("solid", fgColor=_VERDE_CLARO)
    fill_rojo    = PatternFill("solid", fgColor=_ROJO_CLARO)
    font_titulo  = Font(name="Calibri", bold=True, color="FFFFFF", size=13)
    font_sub     = Font(name="Calibri", bold=True, color=_AZUL, size=11)
    font_campo   = Font(name="Calibri", bold=True, size=10)
    font_normal  = Font(name="Calibri", size=10)
    font_nota    = Font(name="Calibri", italic=True, color="555555", size=10)
    alin_izq     = Alignment(horizontal="left", vertical="top", wrap_text=True)
    alin_centro  = Alignment(horizontal="center", vertical="center")

    ws.column_dimensions["A"].width = 22
    ws.column_dimensions["B"].width = 70

    # — Título —
    ws.merge_cells("A1:B1")
    cell = ws["A1"]
    cell.value     = "Instrucciones para completar la plantilla — Sistema Dashboard CEPLAN"
    cell.fill      = fill_titulo
    cell.font      = font_titulo
    cell.alignment = alin_centro
    ws.row_dimensions[1].height = 30

    # — Subtítulo —
    ws.merge_cells("A2:B2")
    cell = ws["A2"]
    cell.value     = "Directiva N° 0056-2024-CEPLAN/PCD — Seguimiento y evaluación de procesos"
    cell.font      = Font(name="Calibri", italic=True, color="666666", size=10)
    cell.alignment = alin_centro
    ws.row_dimensions[2].height = 18

    fila = 4

    # — Encabezado de tabla de columnas —
    for col, texto, ancho_fila in [("A", "Columna", 22), ("B", "Descripción y valores válidos", 70)]:
        cell = ws.cell(row=fila, column=ord(col) - 64, value=texto)
        cell.fill      = PatternFill("solid", fgColor="2D4F7A")
        cell.font      = Font(name="Calibri", bold=True, color="FFFFFF", size=10)
        cell.alignment = alin_centro
        cell.border    = _borde_fino()
    ws.row_dimensions[fila].height = 20
    fila += 1

    # — Filas de descripción de cada columna —
    for nombre, descripcion in _COLUMNAS:
        cell_a = ws.cell(row=fila, column=1, value=nombre)
        cell_b = ws.cell(row=fila, column=2, value=descripcion)
        cell_a.fill      = fill_col
        cell_a.font      = font_campo
        cell_b.font      = font_normal
        cell_a.alignment = alin_izq
        cell_b.alignment = alin_izq
        cell_a.border    = _borde_fino()
        cell_b.border    = _borde_fino()
        ws.row_dimensions[fila].height = 42
        fila += 1

    fila += 1

    # — Notas importantes —
    ws.merge_cells(f"A{fila}:B{fila}")
    cell = ws[f"A{fila}"]
    cell.value     = "Notas importantes"
    cell.font      = font_sub
    cell.alignment = alin_izq
    ws.row_dimensions[fila].height = 20
    fila += 1

    notas = [
        ("Numerador / Denominador vs Resultado Obtenido",
         "Si completas Numerador y Denominador, el sistema calcula automáticamente el Resultado Obtenido "
         "(Numerador/Denominador × 100 para unidades %). El campo Resultado Obtenido solo se usa si no hay "
         "numerador/denominador disponibles (ej. indicadores de días promedio)."),
        ("Código del proceso",
         "Debe seguir el patrón M<n>.<m> donde <n> es el número de módulo y <m> el número de proceso dentro "
         "del módulo. Ejemplos válidos: M1.1  M2.3  M3.2  M4.1  M5.1"),
        ("Módulos",
         "El sistema espera los módulos M1, M2, M3 y M4 por defecto. Puedes agregar M5, M6, etc. configurando "
         "la variable de entorno MODULOS_ESPERADOS en el servidor."),
        ("Filas de ejemplo",
         "Las filas en gris de la hoja Datos son ejemplos. Puedes reemplazarlas o eliminarlas. "
         "El sistema solo procesa filas cuyo Codigo coincida con el patrón M#.# y cuyo Mes sea un mes válido."),
    ]

    for titulo_nota, texto_nota in notas:
        cell_a = ws.cell(row=fila, column=1, value=titulo_nota)
        cell_b = ws.cell(row=fila, column=2, value=texto_nota)
        cell_a.fill      = fill_nota
        cell_b.fill      = fill_nota
        cell_a.font      = Font(name="Calibri", bold=True, size=10, color="7A5C00")
        cell_b.font      = Font(name="Calibri", size=10, color="555555")
        cell_a.alignment = alin_izq
        cell_b.alignment = alin_izq
        cell_a.border    = _borde_fino()
        cell_b.border    = _borde_fino()
        ws.row_dimensions[fila].height = 60
        fila += 1


@router.get("/plantilla", response_class=StreamingResponse)
def descargar_plantilla():
    wb = Workbook()
    _hoja_datos(wb)
    _hoja_instrucciones(wb)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=plantilla_ceplan.xlsx"},
    )

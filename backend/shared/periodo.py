import os

from shared.meses import MESES_ORDENADOS

# La evaluación de desempeño es semestral (cada 6 meses):
#   S1 = Enero–Junio, S2 = Julio–Diciembre.
# ANUAL abarca los 12 meses: sirve para mirar todo lo cargado sin ocultar meses
# que caigan fuera del semestre que se está evaluando.
SEMESTRES = {
    "ANUAL": MESES_ORDENADOS,
    "S1": MESES_ORDENADOS[:6],
    "S2": MESES_ORDENADOS[6:],
}
_ETIQUETAS = {"ANUAL": "Todo el año", "S1": "Enero–Junio", "S2": "Julio–Diciembre"}

# Semestre por defecto de la evaluación; configurable sin tocar código.
# Ojo: es el default del corte semestral (alertas), no el de toda vista: el
# tablero pide ANUAL explícitamente para no esconder meses ya medidos.
PERIODO_POR_DEFECTO = os.getenv("PERIODO_EVALUACION", "S1").upper()


def _normalizar(periodo: str | None) -> str:
    p = (periodo or PERIODO_POR_DEFECTO).upper()
    return p if p in SEMESTRES else "S1"


def meses_periodo(periodo: str | None = None) -> list[str]:
    """Meses del periodo indicado (6 de un semestre, o los 12 si es ANUAL)."""
    return SEMESTRES[_normalizar(periodo)]


def etiqueta_periodo(periodo: str | None = None) -> str:
    """Etiqueta legible del periodo, p. ej. 'Enero–Junio'."""
    return _ETIQUETAS[_normalizar(periodo)]


def clave_periodo(periodo: str | None = None) -> str:
    """Clave canónica normalizada del periodo ('ANUAL' | 'S1' | 'S2')."""
    return _normalizar(periodo)

import os

from shared.meses import MESES_ORDENADOS

# La evaluación de desempeño es semestral (cada 6 meses):
#   S1 = Enero–Junio, S2 = Julio–Diciembre.
SEMESTRES = {
    "S1": MESES_ORDENADOS[:6],
    "S2": MESES_ORDENADOS[6:],
}
_ETIQUETAS = {"S1": "Enero–Junio", "S2": "Julio–Diciembre"}

# Semestre por defecto; configurable sin tocar código (ej. al cerrar S1).
PERIODO_POR_DEFECTO = os.getenv("PERIODO_EVALUACION", "S1").upper()


def _normalizar(periodo: str | None) -> str:
    p = (periodo or PERIODO_POR_DEFECTO).upper()
    return p if p in SEMESTRES else "S1"


def meses_periodo(periodo: str | None = None) -> list[str]:
    """Los 6 meses del semestre indicado (o el por defecto)."""
    return SEMESTRES[_normalizar(periodo)]


def etiqueta_periodo(periodo: str | None = None) -> str:
    """Etiqueta legible del semestre, p. ej. 'Enero–Junio'."""
    return _ETIQUETAS[_normalizar(periodo)]


def clave_periodo(periodo: str | None = None) -> str:
    """Clave canónica normalizada del semestre ('S1' | 'S2')."""
    return _normalizar(periodo)

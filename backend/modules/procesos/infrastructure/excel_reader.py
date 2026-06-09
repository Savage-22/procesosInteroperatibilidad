import logging
import os
import re

import pandas as pd
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

COLUMNAS = [
    "codigo_proceso",
    "proceso",
    "indicador",
    "meta_texto",
    "meta_final",
    "anio",
    "mes",
    "numerador",
    "denominador",
    "resultado_esperado",
    "resultado_obtenido",
    "diferencia",
    "avance_t1",
    "semaforo",
]

_PATRON_CODIGO = re.compile(r"^M\d+\.\d+$")
_PATRON_MODULO = re.compile(r"M\d+")


def _extraer_modulo(valor_fila0: str) -> str:
    match = _PATRON_MODULO.search(str(valor_fila0))
    return match.group(0) if match else "?"


def _es_descendente(meta_texto: str) -> bool:
    return "≤" in str(meta_texto) or "<=" in str(meta_texto)


def _parsear_hoja(df_raw: pd.DataFrame, modulo: str) -> list[dict]:
    registros = []

    for i in range(3, len(df_raw)):
        fila = df_raw.iloc[i]
        codigo = str(fila.iloc[0]).strip()

        # Detener al primer código que no sea Nivel 1 (ej: M1.1, M2.3)
        if not _PATRON_CODIGO.match(codigo):
            break

        try:
            registro = {
                "codigo_proceso": codigo,
                "proceso": str(fila.iloc[1]).strip(),
                "indicador": str(fila.iloc[2]).strip() if pd.notna(fila.iloc[2]) else "",
                "meta_texto": str(fila.iloc[3]).strip(),
                "meta_final": _float_o_none(fila.iloc[4]),
                "anio": _int_o_none(fila.iloc[5]),
                "mes": str(fila.iloc[6]).strip(),
                "numerador": _float_o_none(fila.iloc[7]),
                "denominador": _float_o_none(fila.iloc[8]),
                "resultado_esperado": _float_o_none(fila.iloc[9]),
                "resultado_obtenido": _float_o_none(fila.iloc[10]),
                "diferencia": _float_o_none(fila.iloc[11]),
                "avance_t1": _float_o_none(fila.iloc[12]),
                "semaforo": str(fila.iloc[13]).strip(),
                "modulo": modulo,
                "es_descendente": _es_descendente(str(fila.iloc[3])),
            }
            registros.append(registro)
        except Exception as e:
            logger.warning(f"Fila {i} ignorada en módulo {modulo}: {e}")

    return registros


def _float_o_none(valor) -> float | None:
    try:
        return float(valor)
    except (TypeError, ValueError):
        return None


def _int_o_none(valor) -> int | None:
    try:
        return int(float(valor))
    except (TypeError, ValueError):
        return None


class ExcelStore:
    """Almacén en memoria de todos los registros leídos desde Excel al iniciar."""

    _registros: list[dict] = []

    @classmethod
    def cargar(cls, excel_path: str) -> None:
        if not os.path.exists(excel_path):
            logger.warning(f"Archivo Excel no encontrado: {excel_path}")
            return

        try:
            xl = pd.ExcelFile(excel_path)
        except Exception as e:
            logger.error(f"No se pudo abrir {excel_path}: {e}")
            return

        registros: list[dict] = []
        for hoja in xl.sheet_names:
            try:
                df_raw = xl.parse(hoja, header=None)
                modulo = _extraer_modulo(df_raw.iloc[0, 0])
                filas = _parsear_hoja(df_raw, modulo)
                registros.extend(filas)
                logger.info(f"  [{hoja}] → {modulo}: {len(filas)} registros")
            except Exception as e:
                logger.warning(f"  Error en hoja '{hoja}': {e}")

        cls._registros = registros
        logger.info(f"ExcelStore listo: {len(registros)} registros en total")

    @classmethod
    def get_all(cls) -> list[dict]:
        return cls._registros

    @classmethod
    def get_por_modulo(cls, modulo: str) -> list[dict]:
        return [r for r in cls._registros if r["modulo"] == modulo]

    @classmethod
    def get_por_codigo(cls, codigo: str) -> list[dict]:
        return [r for r in cls._registros if r["codigo_proceso"] == codigo]

    @classmethod
    def get_codigos_unicos(cls) -> list[str]:
        vistos: set[str] = set()
        resultado = []
        for r in cls._registros:
            if r["codigo_proceso"] not in vistos:
                vistos.add(r["codigo_proceso"])
                resultado.append(r["codigo_proceso"])
        return resultado

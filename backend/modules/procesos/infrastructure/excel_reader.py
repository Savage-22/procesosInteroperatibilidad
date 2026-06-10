from datetime import datetime
import logging
import os
import re

import pandas as pd
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

MODULOS_ESPERADOS = ["M1", "M2", "M3"]

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
    """Almacén en memoria de los registros del Excel, con recarga en caliente."""

    _registros: list[dict] = []
    _ruta: str | None = None
    _mtime: float | None = None
    _version: int = 0
    _ultima_carga: str | None = None
    _advertencias: list[str] = []

    @classmethod
    def cargar(cls, excel_path: str) -> None:
        cls._ruta = excel_path
        advertencias: list[str] = []

        if not os.path.exists(excel_path):
            logger.warning(f"Archivo Excel no encontrado: {excel_path}")
            cls._mtime = None
            cls._aplicar([], [f"Archivo Excel no encontrado: {os.path.basename(excel_path)}"])
            return

        mtime = os.path.getmtime(excel_path)

        try:
            xl = pd.ExcelFile(excel_path)
        except Exception as e:
            # Se conservan los datos anteriores si el archivo está bloqueado o corrupto
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
                advertencias.append(f"No se pudo leer la hoja '{hoja}' del Excel")

        modulos_presentes = {r["modulo"] for r in registros}
        for esperado in MODULOS_ESPERADOS:
            if esperado not in modulos_presentes:
                advertencias.append(f"El módulo {esperado} no tiene datos en el Excel")

        cls._mtime = mtime
        cls._aplicar(registros, advertencias)
        logger.info(f"ExcelStore listo: {len(registros)} registros en total (versión {cls._version})")

    @classmethod
    def _aplicar(cls, registros: list[dict], advertencias: list[str]) -> None:
        cls._registros = registros
        cls._advertencias = advertencias
        cls._version += 1
        cls._ultima_carga = datetime.now().astimezone().isoformat()

    @classmethod
    def recargar_si_cambio(cls) -> bool:
        """Recarga el Excel si su mtime cambió desde la última carga. Devuelve True si recargó."""
        if not cls._ruta:
            return False

        try:
            mtime_actual = os.path.getmtime(cls._ruta)
        except OSError:
            mtime_actual = None

        if mtime_actual == cls._mtime:
            return False

        logger.info("Cambio detectado en el Excel, recargando…")
        cls.cargar(cls._ruta)
        return True

    @classmethod
    def get_meta(cls) -> dict:
        return {
            "version": cls._version,
            "ultima_carga": cls._ultima_carga,
            "total_registros": len(cls._registros),
            "modulos_cargados": sorted({r["modulo"] for r in cls._registros}),
            "advertencias": cls._advertencias,
        }

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

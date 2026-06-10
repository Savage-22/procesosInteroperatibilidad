from datetime import datetime
import logging
import os
import re
import unicodedata

import pandas as pd
from dotenv import load_dotenv

from shared.meses import ORDEN_MESES

load_dotenv()

logger = logging.getLogger(__name__)

# Configurable porque los módulos del proyecto pueden crecer (ej. agregar M5)
MODULOS_ESPERADOS = [
    m.strip().upper()
    for m in os.getenv("MODULOS_ESPERADOS", "M1,M2,M3,M4").split(",")
    if m.strip()
]

_PATRON_CODIGO = re.compile(r"^M\d+\.\d+$")

# Campos cuya ausencia impide tratar una fila como dato
_CAMPOS_MINIMOS = {"codigo_proceso", "mes", "resultado_esperado"}


def _normalizar(texto) -> str:
    """Minúsculas, sin tildes y con espacios colapsados, para comparar encabezados."""
    plano = unicodedata.normalize("NFKD", str(texto)).encode("ascii", "ignore").decode()
    return " ".join(plano.lower().split())


def _str_o_vacio(valor) -> str:
    if valor is None or pd.isna(valor):
        return ""
    return str(valor).strip()


def _float_o_none(valor) -> float | None:
    try:
        resultado = float(valor)
    except (TypeError, ValueError):
        return None
    return None if pd.isna(resultado) else resultado


def _int_o_none(valor) -> int | None:
    try:
        return int(float(valor))
    except (TypeError, ValueError):
        return None


def _mapear_columnas(fila) -> dict[str, int]:
    """
    Localiza cada campo por palabra clave del encabezado, porque los nombres
    varían entre hojas ("Sentido Indicador" vs "Tipo Indicador",
    "META FINAL" vs "META FINAL (%)").
    """
    indices: dict[str, int] = {}
    for i in range(len(fila)):
        h = _normalizar(_str_o_vacio(fila.iloc[i]))
        if not h:
            continue
        if "codigo" in h:
            indices.setdefault("codigo_proceso", i)
        elif h == "proceso":
            indices.setdefault("proceso", i)
        elif h == "indicador":
            indices.setdefault("indicador", i)
        elif "sentido" in h or h.startswith("tipo"):
            indices.setdefault("sentido", i)
        elif "unidad" in h:
            indices.setdefault("unidad", i)
        elif h.startswith("meta"):
            indices.setdefault("meta_final", i)
        elif h.startswith("ano"):
            indices.setdefault("anio", i)
        elif h == "mes":
            indices.setdefault("mes", i)
        elif "numerador" in h:
            indices.setdefault("numerador", i)
        elif "denominador" in h:
            indices.setdefault("denominador", i)
        elif "esperado" in h:
            indices.setdefault("resultado_esperado", i)
        elif "obtenido" in h:
            indices.setdefault("resultado_obtenido", i)
    return indices


def _buscar_encabezado(df_raw: pd.DataFrame) -> tuple[int, dict[str, int]] | None:
    """Busca la fila de encabezados en las primeras filas de la hoja."""
    for i in range(min(10, len(df_raw))):
        indices = _mapear_columnas(df_raw.iloc[i])
        if _CAMPOS_MINIMOS <= indices.keys():
            return i, indices
    return None


def _meta_texto(meta_final: float | None, unidad: str, es_descendente: bool) -> str:
    if meta_final is None:
        return ""
    simbolo = "≤" if es_descendente else "≥"
    return f"{simbolo} {meta_final:g} {unidad}".strip()


def _parsear_hoja(df_raw: pd.DataFrame, hoja: str) -> tuple[list[dict], list[str]]:
    """
    Extrae los registros de una hoja. Solo se confía en los datos crudos del
    Excel (numerador, denominador, esperado, meta); el resultado obtenido,
    la diferencia, el avance T1 y el semáforo se calculan en el backend.
    """
    encontrado = _buscar_encabezado(df_raw)
    if not encontrado:
        return [], [f"La hoja '{hoja}' no tiene la fila de encabezados esperada"]

    fila_encabezado, col = encontrado
    registros: list[dict] = []

    def valor(fila, campo):
        i = col.get(campo)
        return fila.iloc[i] if i is not None else None

    for i in range(fila_encabezado + 1, len(df_raw)):
        fila = df_raw.iloc[i]
        codigo = _str_o_vacio(valor(fila, "codigo_proceso")).upper()
        mes = _str_o_vacio(valor(fila, "mes")).capitalize()

        # Solo filas de datos reales: descarta notas, tablas auxiliares y vacíos
        if not _PATRON_CODIGO.match(codigo) or mes not in ORDEN_MESES:
            continue

        sentido = _str_o_vacio(valor(fila, "sentido"))
        es_descendente = "descendente" in sentido.lower()
        unidad = _str_o_vacio(valor(fila, "unidad"))

        meta_final = _float_o_none(valor(fila, "meta_final"))
        numerador = _float_o_none(valor(fila, "numerador"))
        denominador = _float_o_none(valor(fila, "denominador"))
        esperado = _float_o_none(valor(fila, "resultado_esperado"))

        # El obtenido se deriva de numerador/denominador; la columna del Excel
        # solo es respaldo para indicadores sin conteo (evita errores de tipeo).
        # En unidades no porcentuales (ej. días) es un promedio: total/casos.
        if numerador is not None and denominador:
            bruto = numerador / denominador
            es_porcentual = unidad in ("", "%")
            obtenido = round(bruto * 100, 2) if es_porcentual else round(bruto, 2)
        else:
            obtenido = _float_o_none(valor(fila, "resultado_obtenido"))

        diferencia = (
            round(obtenido - esperado, 2)
            if obtenido is not None and esperado is not None
            else None
        )

        registros.append({
            "codigo_proceso": codigo,
            "proceso": _str_o_vacio(valor(fila, "proceso")),
            "indicador": _str_o_vacio(valor(fila, "indicador")),
            "sentido": sentido or "Ascendente",
            "unidad": unidad,
            "meta_texto": _meta_texto(meta_final, unidad, es_descendente),
            "meta_final": meta_final,
            "anio": _int_o_none(valor(fila, "anio")),
            "mes": mes,
            "numerador": numerador,
            "denominador": denominador,
            "resultado_esperado": esperado,
            "resultado_obtenido": obtenido,
            "diferencia": diferencia,
            "modulo": codigo.split(".")[0],
            "es_descendente": es_descendente,
        })

    return registros, []


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
                filas, avisos = _parsear_hoja(df_raw, hoja)
                registros.extend(filas)
                advertencias.extend(avisos)
                modulos = sorted({r["modulo"] for r in filas})
                logger.info(f"  [{hoja}] → {modulos}: {len(filas)} registros")
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
    def get_ruta(cls) -> str | None:
        return cls._ruta

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

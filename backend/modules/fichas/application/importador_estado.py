import logging
import re

import pandas as pd
from sqlmodel import Session, select

from modules.fichas.application.cambio_service import ETAPAS
from modules.fichas.application.causa_service import CATEGORIAS_6M
from modules.fichas.application.oportunidad_service import ESTADOS, ESTRATEGIAS
from modules.fichas.application.investigacion_service import TIPOS as TIPOS_INVESTIGACION
from modules.fichas.infrastructure.models import (
    AccionCambio,
    Causa,
    FichaIndicador,
    FichaProceso,
    Investigacion,
    Oportunidad,
    Organizacion,
    Proceso,
    Proyeccion,
)
from modules.procesos.infrastructure.excel_reader import normalizar, str_o_vacio
from shared.meses import ORDEN_MESES

logger = logging.getLogger(__name__)

# Separador con el que el export une las listas del SIPOC en una celda
_SEP_LISTA = "|"

# Código de macroproceso de la hoja Investigaciones: M1, M2… (sin subnivel)
_PATRON_MACROPROCESO = re.compile(r"^M\d+$")

# Encabezado de la hoja → campo del modelo. Se compara normalizado (minúsculas,
# sin tildes), así que "Dueño" llega como "dueno" y "Categoria (6M)" como
# "categoria (6m)". Los nombres son los que escribe el export, para que el libro
# exportado se pueda volver a subir tal cual.
_HOJAS = {
    "organizacion": {
        "columnas": {"nombre": "nombre", "sector": "sector"},
    },
    "inventario": {
        "columnas": {
            "codigo": "codigo", "nivel": "nivel", "codigo padre": "codigo_padre",
            "nombre": "nombre", "producto": "producto", "base legal": "base_legal",
        },
    },
    "fichas sipoc": {
        "columnas": {
            "codigo": "codigo", "tipo": "tipo", "dueno": "dueno", "objetivo": "objetivo",
            "objetivo estrategico": "objetivo_estrategico",
            "proveedores": "proveedores", "entradas": "entradas", "salidas": "salidas",
            "receptores": "receptores", "actividades (pdca)": "actividades",
            "actividades": "actividades", "riesgos": "riesgos", "registros": "registros",
            "elaborado por": "elaborado_por", "revisado por": "revisado_por",
            "aprobado por": "aprobado_por",
        },
    },
    "indicadores": {
        "columnas": {
            "codigo": "codigo", "indicador": "indicador", "tipo": "tipo",
            "sentido": "sentido", "unidad": "unidad", "formula": "formula",
            "fuente": "fuente", "responsable": "responsable", "linea base": "linea_base",
            "meta final": "meta_final", "relevancia": "relevancia",
            "objetivo estrategico": "objetivo_estrategico",
            "accion estrategica": "accion_estrategica",
        },
    },
    "investigaciones": {
        "columnas": {
            "macroproceso": "macroproceso", "modulo": "macroproceso",
            "titulo": "titulo", "autores": "autores", "ano": "anio",
            "tipo": "tipo", "institucion": "institucion", "url": "url",
            "enlace": "url", "aporte al macroproceso": "aporte", "aporte": "aporte",
        },
    },
    "ishikawa": {
        "columnas": {
            "codigo": "codigo", "categoria (6m)": "categoria", "categoria": "categoria",
            "causa": "descripcion", "es raiz": "es_raiz", "peso": "peso",
        },
    },
    "oportunidades": {
        "columnas": {
            "codigo": "codigo", "oportunidad": "descripcion",
            "accion propuesta": "accion_propuesta", "costo (c)": "costo", "costo": "costo",
            "impacto (i)": "impacto", "impacto": "impacto",
            "probabilidad": "probabilidad", "consecuencia": "consecuencia",
            "estrategia": "estrategia", "estado": "estado",
        },
    },
    "proyeccion": {
        "columnas": {
            "codigo": "codigo", "indicador": "indicador", "mes": "mes",
            "ano": "anio", "valor proyectado": "valor", "valor": "valor", "nota": "nota",
        },
    },
    "gestion del cambio": {
        "columnas": {
            "codigo": "codigo", "etapa (lewin)": "etapa", "etapa": "etapa",
            "accion": "descripcion", "responsable": "responsable",
            "fecha": "fecha", "estado": "estado",
        },
    },
}


class ImportadorEstado:
    """
    Importa las hojas del libro que no son mediciones: inventario, fichas SIPOC,
    indicadores caracterizados y el ciclo de mejora completo.

    Con esto el Excel que exporta el sistema vuelve a entrar entero, que es lo
    que se espera de una plantilla: antes solo se releía la hoja de datos y todo
    lo trabajado dentro del sistema se quedaba fuera del viaje de ida y vuelta.

    El upsert es idempotente —mismas claves naturales que `ImportadorExcel`— así
    que resubir el mismo archivo actualiza en vez de duplicar. Las filas
    inválidas (proceso inexistente, categoría fuera de las 6M) se saltan y se
    cuentan como omitidas: un error de tipeo no debe abortar la importación.
    """

    @staticmethod
    def importar(session: Session, fuente, org: Organizacion) -> dict:
        resumen = {clave: 0 for clave in _HOJAS}
        resumen["omitidas"] = 0

        try:
            libro = pd.ExcelFile(fuente)
        except Exception as e:
            logger.warning(f"No se pudo abrir el libro para leer el estado: {e}")
            return resumen

        procesos = {
            p.codigo: p
            for p in session.exec(select(Proceso).where(Proceso.organizacion_id == org.id)).all()
        }

        for hoja in libro.sheet_names:
            clave = normalizar(hoja)
            config = _HOJAS.get(clave)
            if config is None:
                continue
            try:
                filas = _leer_hoja(libro.parse(hoja, header=None), config["columnas"])
            except Exception as e:
                logger.warning(f"No se pudo leer la hoja '{hoja}': {e}")
                continue

            manejador = getattr(ImportadorEstado, f"_importar_{clave.replace(' ', '_')}")
            creados, omitidas = manejador(session, filas, procesos, org)
            resumen[clave] += creados
            resumen["omitidas"] += omitidas

        session.commit()
        return resumen

    # ------------------------------------------------------------------ #
    # Una hoja, un manejador. Todos devuelven (aplicadas, omitidas).      #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _importar_organizacion(session, filas, procesos, org) -> tuple[int, int]:
        for fila in filas:
            nombre = _texto(fila.get("nombre"))
            if not nombre:
                continue
            org.nombre = nombre
            org.sector = _texto(fila.get("sector")) or org.sector
            session.add(org)
            return 1, 0
        return 0, 0

    @staticmethod
    def _importar_inventario(session, filas, procesos, org) -> tuple[int, int]:
        aplicadas = omitidas = 0
        for fila in filas:
            codigo = _texto(fila.get("codigo")).upper()
            if not codigo:
                omitidas += 1
                continue

            proceso = procesos.get(codigo)
            if proceso is None:
                proceso = Proceso(
                    organizacion_id=org.id, codigo=codigo,
                    nombre=_texto(fila.get("nombre")) or codigo,
                )
                session.add(proceso)
                session.flush()
                procesos[codigo] = proceso

            if _texto(fila.get("nombre")):
                proceso.nombre = _texto(fila.get("nombre"))
            nivel = _entero(fila.get("nivel"))
            proceso.nivel = nivel if nivel is not None else codigo.count(".")
            proceso.codigo_padre = _texto(fila.get("codigo_padre")).upper() or None
            proceso.producto = _texto(fila.get("producto")) or None
            proceso.base_legal = _texto(fila.get("base_legal")) or None
            session.add(proceso)
            aplicadas += 1
        return aplicadas, omitidas

    @staticmethod
    def _importar_fichas_sipoc(session, filas, procesos, org) -> tuple[int, int]:
        aplicadas = omitidas = 0
        for fila in filas:
            proceso = _proceso_de(fila, procesos)
            if proceso is None:
                omitidas += 1
                continue

            ficha = session.exec(
                select(FichaProceso).where(FichaProceso.proceso_id == proceso.id)
            ).first()
            if ficha is None:
                ficha = FichaProceso(proceso_id=proceso.id)
                session.add(ficha)

            for campo in ("tipo", "dueno", "objetivo", "objetivo_estrategico",
                          "elaborado_por", "revisado_por", "aprobado_por"):
                setattr(ficha, campo, _texto(fila.get(campo)) or None)
            for campo in ("proveedores", "entradas", "salidas", "receptores",
                          "actividades", "riesgos", "registros"):
                setattr(ficha, campo, _lista(fila.get(campo)))

            session.add(ficha)
            aplicadas += 1
        return aplicadas, omitidas

    @staticmethod
    def _importar_indicadores(session, filas, procesos, org) -> tuple[int, int]:
        aplicadas = omitidas = 0
        for fila in filas:
            proceso = _proceso_de(fila, procesos)
            nombre = _texto(fila.get("indicador"))
            if proceso is None or not nombre:
                omitidas += 1
                continue

            indicador = session.exec(
                select(FichaIndicador).where(
                    FichaIndicador.proceso_id == proceso.id,
                    FichaIndicador.nombre == nombre,
                )
            ).first()
            if indicador is None:
                indicador = FichaIndicador(proceso_id=proceso.id, nombre=nombre)
                session.add(indicador)

            # La hoja de datos ya fijó sentido, unidad, meta y relevancia; aquí
            # solo se sobrescriben si esta hoja los trae, para no borrarlos.
            for campo in ("tipo", "unidad", "formula", "fuente", "responsable",
                          "objetivo_estrategico", "accion_estrategica"):
                valor = _texto(fila.get(campo))
                if valor:
                    setattr(indicador, campo, valor)
            if _texto(fila.get("sentido")):
                indicador.sentido = _texto(fila.get("sentido"))
            for campo in ("linea_base", "meta_final"):
                valor = _decimal(fila.get(campo))
                if valor is not None:
                    setattr(indicador, campo, valor)
            relevancia = _entero(fila.get("relevancia"))
            if relevancia in (1, 2, 3):
                indicador.relevancia = relevancia

            session.add(indicador)
            aplicadas += 1
        return aplicadas, omitidas

    @staticmethod
    def _importar_investigaciones(session, filas, procesos, org) -> tuple[int, int]:
        """
        El sustento académico cuelga del macroproceso, así que no se valida
        contra el inventario: basta que el módulo siga el patrón M<número>.
        """
        aplicadas = omitidas = 0
        for fila in filas:
            macroproceso = _texto(fila.get("macroproceso")).upper().split(".")[0]
            titulo = _texto(fila.get("titulo"))
            if not _PATRON_MACROPROCESO.match(macroproceso) or not titulo:
                omitidas += 1
                continue

            investigacion = session.exec(
                select(Investigacion).where(
                    Investigacion.organizacion_id == org.id,
                    Investigacion.macroproceso == macroproceso,
                    Investigacion.titulo == titulo,
                )
            ).first()
            if investigacion is None:
                investigacion = Investigacion(
                    organizacion_id=org.id, macroproceso=macroproceso, titulo=titulo,
                )
                session.add(investigacion)

            for campo in ("autores", "institucion", "url", "aporte"):
                setattr(investigacion, campo, _texto(fila.get(campo)) or None)
            investigacion.tipo = _coincidencia(_texto(fila.get("tipo")), TIPOS_INVESTIGACION)
            investigacion.anio = _entero(fila.get("anio"))
            investigacion.activo = True
            session.add(investigacion)
            aplicadas += 1
        return aplicadas, omitidas

    @staticmethod
    def _importar_ishikawa(session, filas, procesos, org) -> tuple[int, int]:
        aplicadas = omitidas = 0
        for fila in filas:
            proceso = _proceso_de(fila, procesos)
            categoria = _coincidencia(_texto(fila.get("categoria")), CATEGORIAS_6M)
            descripcion = _texto(fila.get("descripcion"))
            if proceso is None or categoria is None or not descripcion:
                omitidas += 1
                continue

            causa = session.exec(
                select(Causa).where(
                    Causa.proceso_id == proceso.id,
                    Causa.categoria == categoria,
                    Causa.descripcion == descripcion,
                )
            ).first()
            if causa is None:
                causa = Causa(
                    proceso_id=proceso.id, categoria=categoria, descripcion=descripcion,
                )
                session.add(causa)

            causa.es_raiz = _booleano(fila.get("es_raiz"))
            causa.peso = _decimal(fila.get("peso")) or 1.0
            causa.activo = True
            session.add(causa)
            aplicadas += 1
        return aplicadas, omitidas

    @staticmethod
    def _importar_oportunidades(session, filas, procesos, org) -> tuple[int, int]:
        aplicadas = omitidas = 0
        for fila in filas:
            proceso = _proceso_de(fila, procesos)
            descripcion = _texto(fila.get("descripcion"))
            if proceso is None or not descripcion:
                omitidas += 1
                continue

            oportunidad = session.exec(
                select(Oportunidad).where(
                    Oportunidad.proceso_id == proceso.id,
                    Oportunidad.descripcion == descripcion,
                )
            ).first()
            if oportunidad is None:
                oportunidad = Oportunidad(proceso_id=proceso.id, descripcion=descripcion)
                session.add(oportunidad)

            oportunidad.accion_propuesta = _texto(fila.get("accion_propuesta")) or None
            for campo in ("costo", "impacto", "probabilidad", "consecuencia"):
                valor = _entero(fila.get(campo))
                if valor is not None:
                    setattr(oportunidad, campo, max(1, min(valor, 5)))
            oportunidad.estrategia = _coincidencia(_texto(fila.get("estrategia")), ESTRATEGIAS)
            oportunidad.estado = _coincidencia(_texto(fila.get("estado")), ESTADOS) or "propuesta"
            oportunidad.activo = True
            session.add(oportunidad)
            aplicadas += 1
        return aplicadas, omitidas

    @staticmethod
    def _importar_proyeccion(session, filas, procesos, org) -> tuple[int, int]:
        """
        Los meses proyectados llegan uno por fila y se agrupan por indicador,
        porque el modelo guarda la serie completa en un solo registro.
        """
        series: dict[int, dict] = {}
        omitidas = 0

        for fila in filas:
            proceso = _proceso_de(fila, procesos)
            mes = _texto(fila.get("mes")).capitalize()
            valor = _decimal(fila.get("valor"))
            if proceso is None or mes not in ORDEN_MESES or valor is None:
                omitidas += 1
                continue

            indicador = _indicador_de(session, proceso, _texto(fila.get("indicador")))
            if indicador is None:
                omitidas += 1
                continue

            serie = series.setdefault(indicador.id, {"meses": [], "nota": None})
            serie["meses"].append({"mes": mes, "anio": _entero(fila.get("anio")), "valor": valor})
            serie["nota"] = serie["nota"] or (_texto(fila.get("nota")) or None)

        for indicador_id, serie in series.items():
            proyeccion = session.exec(
                select(Proyeccion).where(Proyeccion.indicador_id == indicador_id)
            ).first()
            if proyeccion is None:
                proyeccion = Proyeccion(indicador_id=indicador_id)
                session.add(proyeccion)
            proyeccion.meses = sorted(serie["meses"], key=lambda m: ORDEN_MESES[m["mes"]])
            proyeccion.nota = serie["nota"]
            session.add(proyeccion)

        return len(series), omitidas

    @staticmethod
    def _importar_gestion_del_cambio(session, filas, procesos, org) -> tuple[int, int]:
        aplicadas = omitidas = 0
        for fila in filas:
            proceso = _proceso_de(fila, procesos)
            etapa = _coincidencia(_texto(fila.get("etapa")), ETAPAS)
            descripcion = _texto(fila.get("descripcion"))
            if proceso is None or etapa is None or not descripcion:
                omitidas += 1
                continue

            accion = session.exec(
                select(AccionCambio).where(
                    AccionCambio.proceso_id == proceso.id,
                    AccionCambio.etapa == etapa,
                    AccionCambio.descripcion == descripcion,
                )
            ).first()
            if accion is None:
                accion = AccionCambio(
                    proceso_id=proceso.id, etapa=etapa, descripcion=descripcion,
                )
                session.add(accion)

            accion.responsable = _texto(fila.get("responsable")) or None
            accion.fecha = _texto(fila.get("fecha")) or None
            accion.estado = _coincidencia(
                _texto(fila.get("estado")), ["pendiente", "en_curso", "hecho"]
            ) or "pendiente"
            accion.activo = True
            session.add(accion)
            aplicadas += 1
        return aplicadas, omitidas


# --------------------------------------------------------------------------- #
# Lectura genérica de una hoja                                                #
# --------------------------------------------------------------------------- #

def _leer_hoja(df_raw: pd.DataFrame, columnas: dict[str, str]) -> list[dict]:
    """
    Devuelve una fila por registro, con los campos que la hoja traiga. Busca los
    encabezados en las primeras filas —no siempre están en la primera, porque
    quien edita el libro suele agregar un título— y solo acepta la fila que
    reconozca al menos dos columnas conocidas.
    """
    for i in range(min(10, len(df_raw))):
        indices: dict[str, int] = {}
        for j in range(len(df_raw.columns)):
            encabezado = normalizar(str_o_vacio(df_raw.iloc[i].iloc[j]))
            campo = columnas.get(encabezado)
            if campo and campo not in indices:
                indices[campo] = j
        if len(indices) < 2:
            continue

        filas = []
        for k in range(i + 1, len(df_raw)):
            fila = {campo: df_raw.iloc[k].iloc[j] for campo, j in indices.items()}
            if any(_texto(v) for v in fila.values()):
                filas.append(fila)
        return filas

    return []


# --------------------------------------------------------------------------- #
# Conversión de celdas                                                        #
# --------------------------------------------------------------------------- #

def _texto(valor) -> str:
    return str_o_vacio(valor)


def _lista(valor) -> list[str]:
    texto = _texto(valor)
    if not texto:
        return []
    return [parte.strip() for parte in texto.split(_SEP_LISTA) if parte.strip()]


def _decimal(valor) -> float | None:
    try:
        numero = float(valor)
    except (TypeError, ValueError):
        return None
    return None if pd.isna(numero) else numero


def _entero(valor) -> int | None:
    numero = _decimal(valor)
    return None if numero is None else int(numero)


def _booleano(valor) -> bool:
    return normalizar(_texto(valor)) in ("si", "true", "verdadero", "x", "1", "1.0")


def _coincidencia(valor: str, validos: list[str]) -> str | None:
    """Empareja sin distinguir mayúsculas ni tildes, y devuelve el valor canónico."""
    objetivo = normalizar(valor)
    if not objetivo:
        return None
    for valido in validos:
        if normalizar(valido) == objetivo:
            return valido
    return None


def _proceso_de(fila: dict, procesos: dict[str, Proceso]) -> Proceso | None:
    return procesos.get(_texto(fila.get("codigo")).upper())


def _indicador_de(session: Session, proceso: Proceso, nombre: str) -> FichaIndicador | None:
    """El indicador con ese nombre; si la fila no lo nombra, el primero del proceso."""
    consulta = select(FichaIndicador).where(
        FichaIndicador.proceso_id == proceso.id,
        FichaIndicador.activo == True,  # noqa: E712
    )
    if nombre:
        encontrado = session.exec(consulta.where(FichaIndicador.nombre == nombre)).first()
        if encontrado:
            return encontrado
    return session.exec(consulta).first()

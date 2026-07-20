from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, Relationship, SQLModel


def _ahora() -> datetime:
    return datetime.now(timezone.utc)


# --------------------------------------------------------------------------- #
# Organización — dueña de todo el inventario y sus fichas                      #
# --------------------------------------------------------------------------- #

class Organizacion(SQLModel, table=True):
    __tablename__ = "organizacion"

    id: int | None = Field(default=None, primary_key=True)
    nombre: str
    sector: str | None = None
    # Estado del asistente "empezar de 0": pendiente | en_progreso | completado
    estado_onboarding: str = Field(default="pendiente")
    activo: bool = Field(default=True)
    creado_en: datetime = Field(default_factory=_ahora)
    actualizado_en: datetime = Field(default_factory=_ahora)

    procesos: list["Proceso"] = Relationship(
        back_populates="organizacion",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


# --------------------------------------------------------------------------- #
# Anexo 1 — Inventario de Productos y Procesos (jerarquía Nivel 0→3)           #
# --------------------------------------------------------------------------- #

class Proceso(SQLModel, table=True):
    __tablename__ = "proceso"

    id: int | None = Field(default=None, primary_key=True)
    organizacion_id: int = Field(foreign_key="organizacion.id", index=True)

    codigo: str = Field(index=True)          # M3, M3.1, M3.1.1, M3.1.1.1
    nivel: int = Field(default=0)            # 0=macroproceso … 3=actividad
    codigo_padre: str | None = None          # código del proceso de nivel superior
    nombre: str
    producto: str | None = None
    base_legal: str | None = None
    activo: bool = Field(default=True)
    creado_en: datetime = Field(default_factory=_ahora)
    actualizado_en: datetime = Field(default_factory=_ahora)

    organizacion: Organizacion = Relationship(back_populates="procesos")
    # Anexo 2: una ficha SIPOC por proceso
    ficha: Optional["FichaProceso"] = Relationship(
        back_populates="proceso",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "uselist": False},
    )
    # Anexo 4: varios indicadores por proceso
    indicadores: list["FichaIndicador"] = Relationship(
        back_populates="proceso",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


# --------------------------------------------------------------------------- #
# Anexo 2 — Ficha de Producto y Proceso (SIPOC) — 1 a 1 con Proceso            #
# --------------------------------------------------------------------------- #

class FichaProceso(SQLModel, table=True):
    __tablename__ = "ficha_proceso"

    id: int | None = Field(default=None, primary_key=True)
    proceso_id: int = Field(foreign_key="proceso.id", unique=True, index=True)

    tipo: str | None = None                  # misional | estratégico | soporte
    dueno: str | None = None                 # dueño del proceso
    objetivo: str | None = None              # objetivo del proceso
    objetivo_estrategico: str | None = None  # objetivo estratégico al que aporta

    # SIPOC — se guardan como listas de texto (JSON) porque el número de
    # elementos varía entre procesos
    proveedores: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    entradas: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    salidas: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    receptores: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    actividades: list[str] = Field(default_factory=list, sa_column=Column(JSON))  # ciclo P-D-C-A
    riesgos: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    registros: list[str] = Field(default_factory=list, sa_column=Column(JSON))

    # Firmas
    elaborado_por: str | None = None
    revisado_por: str | None = None
    aprobado_por: str | None = None

    creado_en: datetime = Field(default_factory=_ahora)
    actualizado_en: datetime = Field(default_factory=_ahora)

    proceso: Proceso = Relationship(back_populates="ficha")


# --------------------------------------------------------------------------- #
# Anexo 4 — Ficha de Indicadores — N a 1 con Proceso                           #
# --------------------------------------------------------------------------- #

class FichaIndicador(SQLModel, table=True):
    __tablename__ = "ficha_indicador"

    id: int | None = Field(default=None, primary_key=True)
    proceso_id: int = Field(foreign_key="proceso.id", index=True)

    nombre: str
    tipo: str | None = None                  # eficacia | eficiencia | efectividad
    sentido: str = Field(default="Ascendente")  # Ascendente | Descendente
    unidad: str | None = None
    meta_final: float | None = None
    linea_base: float | None = None
    formula: str | None = None
    fuente: str | None = None
    responsable: str | None = None
    relevancia: int = Field(default=1)       # 1=muy relevante … 3=menos relevante
    # Planeamiento estratégico (CEPLAN): el módulo de objetivos agrupa por estos
    objetivo_estrategico: str | None = None
    accion_estrategica: str | None = None
    activo: bool = Field(default=True)
    creado_en: datetime = Field(default_factory=_ahora)
    actualizado_en: datetime = Field(default_factory=_ahora)

    proceso: Proceso = Relationship(back_populates="indicadores")
    mediciones: list["Medicion"] = Relationship(
        back_populates="indicador",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


# --------------------------------------------------------------------------- #
# Medición mensual de un indicador — N a 1 con FichaIndicador                  #
# --------------------------------------------------------------------------- #

class Medicion(SQLModel, table=True):
    __tablename__ = "medicion"

    id: int | None = Field(default=None, primary_key=True)
    indicador_id: int = Field(foreign_key="ficha_indicador.id", index=True)

    anio: int | None = None
    mes: str                                 # nombre del mes en español (Enero…)
    numerador: float | None = None
    denominador: float | None = None
    resultado_esperado: float | None = None
    resultado_obtenido: float | None = None
    creado_en: datetime = Field(default_factory=_ahora)
    actualizado_en: datetime = Field(default_factory=_ahora)

    indicador: FichaIndicador = Relationship(back_populates="mediciones")


# --------------------------------------------------------------------------- #
# Mejora I — Causa raíz (Ishikawa 6M) — N a 1 con Proceso                      #
# --------------------------------------------------------------------------- #

class Causa(SQLModel, table=True):
    __tablename__ = "causa"

    id: int | None = Field(default=None, primary_key=True)
    proceso_id: int = Field(foreign_key="proceso.id", index=True)

    # Categoría 6M: Método | Personas | Entorno | Medición | Máquina-TI | Materiales
    categoria: str
    descripcion: str
    es_raiz: bool = Field(default=False)
    peso: float = Field(default=1.0)          # frecuencia/impacto para el Pareto
    activo: bool = Field(default=True)
    creado_en: datetime = Field(default_factory=_ahora)
    actualizado_en: datetime = Field(default_factory=_ahora)


# --------------------------------------------------------------------------- #
# Mejora II — Oportunidad de mejora (F = C × I) — N a 1 con Proceso            #
# --------------------------------------------------------------------------- #

class Oportunidad(SQLModel, table=True):
    __tablename__ = "oportunidad"

    id: int | None = Field(default=None, primary_key=True)
    proceso_id: int = Field(foreign_key="proceso.id", index=True)
    causa_id: int | None = Field(default=None, foreign_key="causa.id")

    tipo: str | None = None
    descripcion: str
    accion_propuesta: str | None = None

    # Escalas cualitativas 1–5 de la ficha de mejora
    costo: int = Field(default=1)             # C
    impacto: int = Field(default=1)           # I
    probabilidad: int = Field(default=1)
    consecuencia: int = Field(default=1)

    estrategia: str | None = None             # evitar | mitigar | transferir | aceptar
    estado: str = Field(default="propuesta")  # propuesta | en_curso | implementada | descartada
    activo: bool = Field(default=True)
    creado_en: datetime = Field(default_factory=_ahora)
    actualizado_en: datetime = Field(default_factory=_ahora)


# --------------------------------------------------------------------------- #
# Mejora III — Proyección Antes/Después — 1 a 1 con un indicador               #
# --------------------------------------------------------------------------- #

class Proyeccion(SQLModel, table=True):
    __tablename__ = "proyeccion"

    id: int | None = Field(default=None, primary_key=True)
    indicador_id: int = Field(foreign_key="ficha_indicador.id", unique=True, index=True)
    oportunidad_id: int | None = Field(default=None, foreign_key="oportunidad.id")

    # Meses proyectados tras aplicar la mejora: [{"mes": "Julio", "anio": 2025, "valor": 92}]
    meses: list[dict] = Field(default_factory=list, sa_column=Column(JSON))
    nota: str | None = None
    creado_en: datetime = Field(default_factory=_ahora)
    actualizado_en: datetime = Field(default_factory=_ahora)


# --------------------------------------------------------------------------- #
# Mejora IV — Gestión del cambio (modelo de Kurt Lewin) — N a 1 con Proceso    #
# --------------------------------------------------------------------------- #

class AccionCambio(SQLModel, table=True):
    __tablename__ = "accion_cambio"

    id: int | None = Field(default=None, primary_key=True)
    proceso_id: int = Field(foreign_key="proceso.id", index=True)

    # Etapa del modelo de Kurt Lewin: descongelar | cambiar | recongelar
    etapa: str
    descripcion: str
    responsable: str | None = None
    fecha: str | None = None                   # fecha compromiso (ISO AAAA-MM-DD)
    estado: str = Field(default="pendiente")   # pendiente | en_curso | hecho
    orden: int = Field(default=0)
    activo: bool = Field(default=True)
    creado_en: datetime = Field(default_factory=_ahora)
    actualizado_en: datetime = Field(default_factory=_ahora)


# --------------------------------------------------------------------------- #
# Sustento académico del macroproceso — N a 1 con Organizacion                 #
# --------------------------------------------------------------------------- #

class Investigacion(SQLModel, table=True):
    """
    Investigación (tesis, artículo, norma) que respalda un macroproceso.

    Cuelga del macroproceso —M1, M2…— y no de un proceso del inventario: el
    sustento se argumenta a nivel de módulo y debe poder registrarse aunque el
    macroproceso todavía no exista como fila del Anexo 1.
    """

    __tablename__ = "investigacion"

    id: int | None = Field(default=None, primary_key=True)
    organizacion_id: int = Field(foreign_key="organizacion.id", index=True)

    macroproceso: str = Field(index=True)      # M1, M2, M3, M4…
    titulo: str
    autores: str | None = None
    anio: int | None = None
    tipo: str | None = None                    # tesis | artículo | libro | informe | norma
    institucion: str | None = None
    url: str | None = None
    aporte: str | None = None                  # qué del macroproceso sustenta
    activo: bool = Field(default=True)
    creado_en: datetime = Field(default_factory=_ahora)
    actualizado_en: datetime = Field(default_factory=_ahora)


# --------------------------------------------------------------------------- #
# Salidas de la IA que el usuario quiere conservar (informes y análisis)       #
# --------------------------------------------------------------------------- #

class Informe(SQLModel, table=True):
    """
    Informe o análisis generado por la IA, guardado para que sobreviva al cambio
    de vista y a la recarga: redactarlo cuesta una llamada facturada, así que
    perderlo al navegar era el peor comportamiento posible.

    Se conserva un único informe vigente por (tipo, alcance): regenerar
    reemplaza al anterior, que es lo que el usuario espera del botón "Regenerar".
    """

    __tablename__ = "informe"

    id: int | None = Field(default=None, primary_key=True)
    organizacion_id: int = Field(foreign_key="organizacion.id", index=True)

    tipo: str = Field(index=True)   # ejecutivo | modulo | comparativa | seccion
    # Qué abarca: "" (todo), "M1", "M1,M2,M3" para la comparativa, o
    # "seccion|codigo|periodo" para los paneles de análisis.
    alcance: str = Field(default="", index=True)
    periodo: str | None = None
    titulo: str | None = None
    contenido: dict = Field(default_factory=dict, sa_column=Column(JSON))

    creado_en: datetime = Field(default_factory=_ahora)
    actualizado_en: datetime = Field(default_factory=_ahora)

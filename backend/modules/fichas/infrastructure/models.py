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

    dueno: str | None = None                 # dueño del proceso
    objetivo: str | None = None

    # SIPOC — se guardan como listas de texto (JSON) porque el número de
    # elementos varía entre procesos
    proveedores: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    entradas: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    salidas: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    receptores: list[str] = Field(default_factory=list, sa_column=Column(JSON))
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

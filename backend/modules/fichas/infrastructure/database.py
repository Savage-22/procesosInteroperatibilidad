import os
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import event
from sqlalchemy.engine import Engine, make_url
from sqlmodel import Session, SQLModel, create_engine

# Por defecto SQLite en un archivo local; en producción se apunta a un volumen
# persistente vía DATABASE_URL (ej. sqlite:////data/siip.db). La URL usa el
# esquema estándar de SQLAlchemy, así que migrar a Postgres es cambiar esta
# variable sin tocar modelos ni consultas.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./siip.db")

_es_sqlite = DATABASE_URL.startswith("sqlite")

# check_same_thread=False: FastAPI atiende las peticiones desde un pool de hilos
# y una misma conexión SQLite puede tocar más de uno
_connect_args = {"check_same_thread": False} if _es_sqlite else {}

engine = create_engine(DATABASE_URL, echo=False, connect_args=_connect_args)


@event.listens_for(Engine, "connect")
def _configurar_sqlite(dbapi_conn, _record):
    # WAL permite lecturas concurrentes mientras se escribe; foreign_keys hace
    # que SQLite respete las relaciones y el borrado en cascada (viene apagado)
    if not _es_sqlite:
        return
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def init_db() -> None:
    """Crea el esquema si no existe. Idempotente: seguro llamarlo en cada arranque."""
    if _es_sqlite:
        # make_url conserva si la ruta es relativa (./siip.db) o absoluta
        # (/data/siip.db); armar la ruta a mano rompía el caso absoluto
        ruta = make_url(DATABASE_URL).database
        if ruta and ruta != ":memory:":
            directorio = Path(ruta).parent
            if str(directorio) not in ("", "."):
                directorio.mkdir(parents=True, exist_ok=True)

    # Importa los modelos para que queden registrados en SQLModel.metadata
    from modules.fichas.infrastructure import models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    """Dependencia de FastAPI: entrega una sesión por petición y la cierra al final."""
    with Session(engine) as session:
        yield session

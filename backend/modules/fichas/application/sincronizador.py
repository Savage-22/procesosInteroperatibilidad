import logging
import os

from sqlmodel import Session

from modules.fichas.application.importador import ImportadorExcel
from modules.fichas.application.importador_estado import ImportadorEstado
from modules.fichas.application.lectura_bd import LecturaBD
from modules.fichas.application.organizacion_service import OrganizacionService
from modules.fichas.infrastructure.database import engine
from modules.procesos.infrastructure.excel_reader import ExcelStore, parsear_excel

logger = logging.getLogger(__name__)


class Sincronizador:
    """
    Puente entre el Excel, la BD y el store en memoria (issue #51).

    - La BD es la fuente de verdad.
    - El Excel es semilla inicial y vía de importación (subida desde la UI).
    - El store en memoria (ExcelStore) se hidrata desde la BD para que los
      routers de lectura no cambien.
    """

    _ruta: str | None = None
    _mtime: float | None = None

    @classmethod
    def configurar(cls, ruta: str) -> None:
        cls._ruta = ruta
        cls._mtime = os.path.getmtime(ruta) if ruta and os.path.exists(ruta) else None

    @classmethod
    def get_ruta(cls) -> str | None:
        return cls._ruta

    @classmethod
    def iniciar(cls) -> None:
        """Al arranque: siembra la BD desde el Excel si está vacía y luego hidrata el store."""
        with Session(engine) as session:
            if cls._ruta and os.path.exists(cls._ruta) and not LecturaBD.hay_datos(session):
                try:
                    resumen = cls._importar(session, cls._ruta)
                    logger.info(f"Semilla inicial importada a la BD: {resumen}")
                except Exception as e:
                    logger.error(f"No se pudo importar la semilla inicial: {e}")
            cls._rehidratar(session)

    @classmethod
    def importar_archivo(cls, ruta: str) -> dict:
        """Importa/actualiza un Excel a la BD y rehidrata el store. Devuelve el resumen."""
        with Session(engine) as session:
            resumen = cls._importar(session, ruta)
            cls._rehidratar(session)
        # Evita que el vigilante reimporte la misma versión recién escrita
        if ruta == cls._ruta and os.path.exists(ruta):
            cls._mtime = os.path.getmtime(ruta)
        logger.info(f"Excel importado a la BD: {resumen}")
        return resumen

    @classmethod
    def recargar_si_cambio(cls) -> bool:
        """Reimporta la semilla si su mtime cambió. Lo usa el vigilante del arranque."""
        if not cls._ruta:
            return False
        try:
            mtime_actual = os.path.getmtime(cls._ruta)
        except OSError:
            mtime_actual = None

        if mtime_actual == cls._mtime:
            return False

        cls._mtime = mtime_actual
        if mtime_actual is not None:
            logger.info("Cambio detectado en el Excel semilla, reimportando a la BD…")
            cls.importar_archivo(cls._ruta)
        return True

    @classmethod
    def rehidratar(cls) -> None:
        """Reconstruye el store en memoria desde la BD. Se llama al editar fichas."""
        with Session(engine) as session:
            cls._rehidratar(session)

    @classmethod
    def _importar(cls, session: Session, ruta: str) -> dict:
        """
        Un libro entra en dos pasadas: primero las mediciones —que crean los
        procesos e indicadores— y después el resto del estado, que necesita que
        esos procesos ya existan para colgarse de ellos. Un libro que solo trae
        la hoja de datos sigue funcionando: la segunda pasada no encuentra nada
        que leer y no hace nada.
        """
        registros, _ = parsear_excel(ruta)
        resumen = ImportadorExcel.importar(session, registros)
        org = OrganizacionService.actual(session)
        resumen["estado"] = ImportadorEstado.importar(session, ruta, org)
        return resumen

    @classmethod
    def _rehidratar(cls, session: Session) -> None:
        registros = LecturaBD.construir_registros(session)
        ExcelStore.set_registros(registros)

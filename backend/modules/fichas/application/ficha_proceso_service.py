from sqlmodel import Session, select

from modules.fichas.application.errores import ErrorNoEncontrado
from modules.fichas.application.organizacion_service import OrganizacionService
from modules.fichas.infrastructure.models import FichaProceso, Proceso

# Campos SIPOC y de detalle editables desde el formulario
_CAMPOS_TEXTO = ["tipo", "dueno", "objetivo", "objetivo_estrategico",
                 "elaborado_por", "revisado_por", "aprobado_por"]
_CAMPOS_LISTA = ["proveedores", "entradas", "salidas", "receptores",
                 "actividades", "riesgos", "registros"]


class FichaProcesoService:
    """CRUD de la Ficha de Producto y Proceso (Anexo 2 / SIPOC), 1–1 con el proceso."""

    @staticmethod
    def _resolver_proceso(session: Session, codigo: str) -> Proceso:
        org = OrganizacionService.actual(session)
        proceso = session.exec(
            select(Proceso).where(
                Proceso.organizacion_id == org.id,
                Proceso.codigo == codigo.strip().upper(),
                Proceso.activo == True,  # noqa: E712
            )
        ).first()
        if proceso is None:
            raise ErrorNoEncontrado(f"El proceso '{codigo}' no existe")
        return proceso

    @staticmethod
    def obtener(session: Session, codigo: str) -> dict:
        proceso = FichaProcesoService._resolver_proceso(session, codigo)
        ficha = session.exec(
            select(FichaProceso).where(FichaProceso.proceso_id == proceso.id)
        ).first()
        return FichaProcesoService._serializar(proceso, ficha)

    @staticmethod
    def guardar(session: Session, codigo: str, datos: dict) -> dict:
        proceso = FichaProcesoService._resolver_proceso(session, codigo)
        ficha = session.exec(
            select(FichaProceso).where(FichaProceso.proceso_id == proceso.id)
        ).first()
        if ficha is None:
            ficha = FichaProceso(proceso_id=proceso.id)

        for campo in _CAMPOS_TEXTO:
            if campo in datos:
                valor = datos.get(campo)
                setattr(ficha, campo, (valor or "").strip() or None if isinstance(valor, str) else valor)
        for campo in _CAMPOS_LISTA:
            if campo in datos:
                valores = datos.get(campo) or []
                # Descarta filas vacías que deja el editor dinámico del formulario
                setattr(ficha, campo, [str(v).strip() for v in valores if str(v).strip()])

        session.add(ficha)
        session.commit()
        session.refresh(ficha)
        return FichaProcesoService._serializar(proceso, ficha)

    @staticmethod
    def _serializar(proceso: Proceso, ficha: FichaProceso | None) -> dict:
        base = {
            "codigo": proceso.codigo,
            "nombre_proceso": proceso.nombre,
            "producto": proceso.producto,
            "tiene_ficha": ficha is not None,
        }
        for campo in _CAMPOS_TEXTO:
            base[campo] = getattr(ficha, campo, None) if ficha else None
        for campo in _CAMPOS_LISTA:
            base[campo] = getattr(ficha, campo, []) if ficha else []
        return base

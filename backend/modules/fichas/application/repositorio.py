from datetime import datetime, timezone
from typing import TypeVar

from sqlmodel import Session, SQLModel, select

T = TypeVar("T", bound=SQLModel)


class Repositorio:
    """
    CRUD genérico sobre cualquier modelo SQLModel. Lo usan los routers de las
    fichas (Anexo 1/2/4) para no repetir la mecánica de sesión en cada dominio.
    Las reglas de negocio específicas viven en los servicios de cada módulo.

    Solo métodos estáticos: no se instancia, se pasa el modelo y la sesión.
    """

    @staticmethod
    def crear(session: Session, obj: T) -> T:
        session.add(obj)
        session.commit()
        session.refresh(obj)
        return obj

    @staticmethod
    def obtener(session: Session, modelo: type[T], id: int) -> T | None:
        return session.get(modelo, id)

    @staticmethod
    def listar(session: Session, modelo: type[T], solo_activos: bool = True) -> list[T]:
        consulta = select(modelo)
        # Solo filtra por 'activo' si el modelo lo tiene (Medicion no lleva soft delete)
        if solo_activos and hasattr(modelo, "activo"):
            consulta = consulta.where(modelo.activo == True)  # noqa: E712
        return list(session.exec(consulta).all())

    @staticmethod
    def filtrar(session: Session, modelo: type[T], **campos) -> list[T]:
        consulta = select(modelo)
        for campo, valor in campos.items():
            consulta = consulta.where(getattr(modelo, campo) == valor)
        return list(session.exec(consulta).all())

    @staticmethod
    def actualizar(session: Session, obj: T, cambios: dict) -> T:
        for campo, valor in cambios.items():
            if campo in ("id", "creado_en"):
                continue
            setattr(obj, campo, valor)
        if hasattr(obj, "actualizado_en"):
            obj.actualizado_en = datetime.now(timezone.utc)
        session.add(obj)
        session.commit()
        session.refresh(obj)
        return obj

    @staticmethod
    def desactivar(session: Session, obj: T) -> T:
        """Soft delete: marca 'activo=False' si el modelo lo soporta; si no, borra."""
        if hasattr(obj, "activo"):
            obj.activo = False
            if hasattr(obj, "actualizado_en"):
                obj.actualizado_en = datetime.now(timezone.utc)
            session.add(obj)
        else:
            session.delete(obj)
        session.commit()
        return obj

    @staticmethod
    def eliminar(session: Session, obj: T) -> None:
        """Borrado físico (con cascada a los hijos según los modelos)."""
        session.delete(obj)
        session.commit()

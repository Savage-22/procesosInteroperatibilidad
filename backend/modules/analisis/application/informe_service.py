from datetime import datetime, timezone

from sqlmodel import Session, select

from modules.fichas.application.organizacion_service import OrganizacionService
from modules.fichas.infrastructure.models import Informe

TIPOS = ("ejecutivo", "modulo", "comparativa", "seccion")


class InformeService:
    """
    Guarda y recupera lo que la IA redacta, para que no se pierda al cambiar de
    vista. Cada combinación (tipo, alcance) conserva un solo informe vigente:
    volver a generar lo reemplaza, igual que hace el botón "Regenerar".
    """

    @staticmethod
    def guardar(
        session: Session,
        tipo: str,
        contenido: dict,
        alcance: str = "",
        periodo: str | None = None,
    ) -> dict:
        org = OrganizacionService.actual(session)
        informe = InformeService._buscar(session, org.id, tipo, alcance)

        if informe is None:
            informe = Informe(organizacion_id=org.id, tipo=tipo, alcance=alcance)
            session.add(informe)

        informe.periodo = periodo
        informe.titulo = contenido.get("titulo") or informe.titulo
        informe.contenido = contenido
        informe.actualizado_en = datetime.now(timezone.utc)

        session.commit()
        session.refresh(informe)
        return InformeService._serializar(informe)

    @staticmethod
    def obtener(session: Session, tipo: str, alcance: str = "") -> dict | None:
        org = OrganizacionService.actual(session)
        informe = InformeService._buscar(session, org.id, tipo, alcance)
        return InformeService._serializar(informe) if informe else None

    @staticmethod
    def listar(session: Session, tipo: str | None = None) -> list[dict]:
        """Informes guardados, del más reciente al más antiguo. Sin el contenido."""
        org = OrganizacionService.actual(session)
        consulta = select(Informe).where(Informe.organizacion_id == org.id)
        if tipo:
            consulta = consulta.where(Informe.tipo == tipo)

        informes = sorted(
            session.exec(consulta).all(),
            key=lambda i: i.actualizado_en,
            reverse=True,
        )
        return [InformeService._serializar(i, con_contenido=False) for i in informes]

    @staticmethod
    def eliminar(session: Session, tipo: str, alcance: str = "") -> bool:
        org = OrganizacionService.actual(session)
        informe = InformeService._buscar(session, org.id, tipo, alcance)
        if informe is None:
            return False
        session.delete(informe)
        session.commit()
        return True

    # ------------------------------------------------------------------ #

    @staticmethod
    def _buscar(session: Session, org_id: int, tipo: str, alcance: str) -> Informe | None:
        return session.exec(
            select(Informe).where(
                Informe.organizacion_id == org_id,
                Informe.tipo == tipo,
                Informe.alcance == alcance,
            )
        ).first()

    @staticmethod
    def _serializar(informe: Informe, con_contenido: bool = True) -> dict:
        datos = {
            "id": informe.id,
            "tipo": informe.tipo,
            "alcance": informe.alcance,
            "periodo": informe.periodo,
            "titulo": informe.titulo,
            "generado_en": informe.actualizado_en.isoformat(),
        }
        if con_contenido:
            datos["contenido"] = informe.contenido or {}
        return datos

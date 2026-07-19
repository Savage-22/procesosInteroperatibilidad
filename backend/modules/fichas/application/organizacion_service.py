from datetime import datetime, timezone

from sqlmodel import Session, select

from modules.fichas.application.importador import ORG_DEFAULT
from modules.fichas.infrastructure.models import (
    FichaIndicador,
    FichaProceso,
    Medicion,
    Organizacion,
    Proceso,
)

ESTADOS_ONBOARDING = ("pendiente", "en_progreso", "completado")


class OrganizacionService:
    """
    Resuelve la organización "actual". El despliegue es de una sola entidad por
    instancia, así que se trabaja con la primera organización activa y se crea
    una por defecto si aún no existe.
    """

    @staticmethod
    def actual(session: Session) -> Organizacion:
        org = session.exec(
            select(Organizacion).where(Organizacion.activo == True)  # noqa: E712
        ).first()
        if org:
            return org
        org = Organizacion(nombre=ORG_DEFAULT)
        session.add(org)
        session.commit()
        session.refresh(org)
        return org

    @staticmethod
    def actualizar(session: Session, datos: dict) -> Organizacion:
        org = OrganizacionService.actual(session)
        if "nombre" in datos and (datos.get("nombre") or "").strip():
            org.nombre = datos["nombre"].strip()
        if "sector" in datos:
            org.sector = (datos.get("sector") or "").strip() or None
        estado = datos.get("estado_onboarding")
        if estado in ESTADOS_ONBOARDING:
            org.estado_onboarding = estado
        org.actualizado_en = datetime.now(timezone.utc)
        session.add(org)
        session.commit()
        session.refresh(org)
        return org

    @staticmethod
    def resumen(session: Session) -> dict:
        """Estado de la organización + conteos, para detectar avance y retomar el onboarding."""
        org = OrganizacionService.actual(session)

        procesos = session.exec(
            select(Proceso).where(
                Proceso.organizacion_id == org.id,
                Proceso.activo == True,  # noqa: E712
            )
        ).all()
        proceso_ids = {p.id for p in procesos}

        fichas = set(session.exec(select(FichaProceso.proceso_id)).all())
        indicadores = [
            ind for ind in session.exec(
                select(FichaIndicador).where(FichaIndicador.activo == True)  # noqa: E712
            ).all()
            if ind.proceso_id in proceso_ids
        ]
        indicador_ids = {ind.id for ind in indicadores}
        mediciones = [
            mid for mid in session.exec(select(Medicion.indicador_id)).all()
            if mid in indicador_ids
        ]

        conteos = {
            "procesos": len(procesos),
            "con_ficha": len(proceso_ids & fichas),
            "indicadores": len(indicadores),
            "mediciones": len(mediciones),
        }
        return {
            "nombre": org.nombre,
            "sector": org.sector,
            "estado_onboarding": org.estado_onboarding,
            "tiene_datos": conteos["mediciones"] > 0 or conteos["procesos"] > 0,
            "conteos": conteos,
            # Paso sugerido para retomar el asistente (1..6)
            "paso_sugerido": OrganizacionService._paso_sugerido(org, conteos),
        }

    @staticmethod
    def _paso_sugerido(org: Organizacion, conteos: dict) -> int:
        """
        Dónde retomar el asistente: el primer paso cuyo producto todavía falta.
        Pasos: 1 organización · 2 inventario · 3 fichas · 4 indicadores ·
        5 mediciones · 6 cierre.
        """
        if org.estado_onboarding == "completado":
            return 6
        if conteos["procesos"] == 0:
            return 1 if org.nombre == ORG_DEFAULT else 2
        if conteos["indicadores"] == 0:
            return 3
        if conteos["mediciones"] == 0:
            return 5
        return 6

from sqlmodel import Session, select

from modules.fichas.application.errores import ErrorNoEncontrado, ErrorValidacion
from modules.fichas.application.organizacion_service import OrganizacionService
from modules.fichas.infrastructure.models import FichaIndicador, Medicion, Proceso
from modules.procesos.application.proceso_service import ProcesoService
from modules.procesos.infrastructure.excel_reader import derivar_obtenido
from shared.meses import ORDEN_MESES, orden_mes
from shared.semaforo import calcular_semaforo

_CAMPOS_TEXTO = ["nombre", "tipo", "sentido", "unidad", "formula", "fuente",
                 "responsable", "objetivo_estrategico", "accion_estrategica"]
_CAMPOS_NUM = ["meta_final", "linea_base"]


class IndicadorService:
    """CRUD de fichas de indicadores (Anexo 4) y captura de mediciones mensuales."""

    # ------------------------------------------------------------------ #
    # Indicadores                                                        #
    # ------------------------------------------------------------------ #

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
    def _resolver_indicador(session: Session, indicador_id: int) -> FichaIndicador:
        indicador = session.get(FichaIndicador, indicador_id)
        if indicador is None or not indicador.activo:
            raise ErrorNoEncontrado("El indicador no existe")
        return indicador

    @staticmethod
    def listar(session: Session, codigo: str) -> list[dict]:
        proceso = IndicadorService._resolver_proceso(session, codigo)
        indicadores = session.exec(
            select(FichaIndicador).where(
                FichaIndicador.proceso_id == proceso.id,
                FichaIndicador.activo == True,  # noqa: E712
            )
        ).all()
        return [IndicadorService._serializar(session, ind) for ind in indicadores]

    @staticmethod
    def crear(session: Session, codigo: str, datos: dict) -> dict:
        proceso = IndicadorService._resolver_proceso(session, codigo)
        nombre = (datos.get("nombre") or "").strip()
        if not nombre:
            raise ErrorValidacion("El nombre del indicador es obligatorio")

        indicador = FichaIndicador(proceso_id=proceso.id, nombre=nombre)
        IndicadorService._aplicar_campos(indicador, datos)
        session.add(indicador)
        session.commit()
        session.refresh(indicador)
        return IndicadorService._serializar(session, indicador)

    @staticmethod
    def actualizar(session: Session, indicador_id: int, datos: dict) -> dict:
        indicador = IndicadorService._resolver_indicador(session, indicador_id)
        if "nombre" in datos and not (datos.get("nombre") or "").strip():
            raise ErrorValidacion("El nombre del indicador es obligatorio")
        IndicadorService._aplicar_campos(indicador, datos)
        session.add(indicador)
        session.commit()
        session.refresh(indicador)
        return IndicadorService._serializar(session, indicador)

    @staticmethod
    def eliminar(session: Session, indicador_id: int) -> None:
        indicador = IndicadorService._resolver_indicador(session, indicador_id)
        indicador.activo = False
        session.add(indicador)
        session.commit()

    # ------------------------------------------------------------------ #
    # Mediciones                                                         #
    # ------------------------------------------------------------------ #

    @staticmethod
    def guardar_medicion(session: Session, indicador_id: int, datos: dict) -> dict:
        indicador = IndicadorService._resolver_indicador(session, indicador_id)
        mes = (datos.get("mes") or "").strip().capitalize()
        if mes not in ORDEN_MESES:
            raise ErrorValidacion(f"Mes inválido: '{datos.get('mes')}'")
        anio = datos.get("anio")

        medicion = session.exec(
            select(Medicion).where(
                Medicion.indicador_id == indicador.id,
                Medicion.anio == anio,
                Medicion.mes == mes,
            )
        ).first()
        if medicion is None:
            medicion = Medicion(indicador_id=indicador.id, anio=anio, mes=mes)

        for campo in ("numerador", "denominador", "resultado_esperado", "resultado_obtenido"):
            if campo in datos:
                setattr(medicion, campo, datos.get(campo))

        session.add(medicion)
        session.commit()
        session.refresh(medicion)
        return IndicadorService._serializar(session, indicador)

    @staticmethod
    def eliminar_medicion(session: Session, medicion_id: int) -> None:
        medicion = session.get(Medicion, medicion_id)
        if medicion is None:
            raise ErrorNoEncontrado("La medición no existe")
        session.delete(medicion)
        session.commit()

    # ------------------------------------------------------------------ #
    # Helpers                                                            #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _aplicar_campos(indicador: FichaIndicador, datos: dict) -> None:
        for campo in _CAMPOS_TEXTO:
            if campo in datos:
                valor = datos.get(campo)
                setattr(indicador, campo, (valor or "").strip() or None if isinstance(valor, str) else valor)
        for campo in _CAMPOS_NUM:
            if campo in datos:
                setattr(indicador, campo, datos.get(campo))
        if "relevancia" in datos:
            rel = datos.get("relevancia")
            indicador.relevancia = rel if rel in (1, 2, 3) else 1
        if not indicador.sentido:
            indicador.sentido = "Ascendente"

    @staticmethod
    def _serializar(session: Session, indicador: FichaIndicador) -> dict:
        sentido = indicador.sentido or "Ascendente"
        es_descendente = "descendente" in sentido.lower()
        unidad = indicador.unidad or ""

        mediciones = session.exec(
            select(Medicion).where(Medicion.indicador_id == indicador.id)
        ).all()
        mediciones = sorted(mediciones, key=lambda m: orden_mes(m.mes))

        filas = []
        for m in mediciones:
            obtenido = derivar_obtenido(m.numerador, m.denominador, unidad, m.resultado_obtenido)
            avance = ProcesoService.calcular_avance_t1(obtenido, m.resultado_esperado, es_descendente)
            filas.append({
                "id": m.id,
                "anio": m.anio,
                "mes": m.mes,
                "numerador": m.numerador,
                "denominador": m.denominador,
                "resultado_esperado": m.resultado_esperado,
                "resultado_obtenido": obtenido,
                "avance_t1": avance,
                "semaforo": calcular_semaforo(avance),
            })

        return {
            "id": indicador.id,
            "nombre": indicador.nombre,
            "tipo": indicador.tipo,
            "sentido": sentido,
            "es_descendente": es_descendente,
            "unidad": indicador.unidad,
            "meta_final": indicador.meta_final,
            "linea_base": indicador.linea_base,
            "formula": indicador.formula,
            "fuente": indicador.fuente,
            "responsable": indicador.responsable,
            "relevancia": indicador.relevancia,
            "objetivo_estrategico": indicador.objetivo_estrategico,
            "accion_estrategica": indicador.accion_estrategica,
            "mediciones": filas,
        }

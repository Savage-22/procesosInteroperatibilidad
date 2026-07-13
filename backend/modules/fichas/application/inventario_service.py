from sqlmodel import Session, select

from modules.fichas.application.errores import ErrorValidacion
from modules.fichas.application.organizacion_service import OrganizacionService
from modules.fichas.infrastructure.models import FichaIndicador, FichaProceso, Proceso

NIVEL_MAXIMO = 3

# Plantilla de arranque: macroprocesos M1–M4 de interoperabilidad y sus procesos.
# Sirve como punto de partida editable para una organización que empieza de 0.
# Cada proceso trae un indicador sugerido (nombre, sentido, unidad, meta_final)
# para que quede medible y la evaluación semestral pueda calcularse; todo es
# editable en el Anexo 4 y las metas son referenciales.
def _ind(nombre, meta, sentido="Ascendente", unidad="%"):
    return {"nombre": nombre, "sentido": sentido, "unidad": unidad, "meta_final": meta}


PLANTILLA_INTEROPERABILIDAD = [
    ("M1", "Diseño de servicios de interoperabilidad", [
        ("M1.1", "Identificación de necesidades del servicio", _ind("% de requisitos de interoperabilidad validados", 90)),
        ("M1.2", "Análisis del proceso actual", _ind("% de procesos actuales diagnosticados", 90)),
        ("M1.3", "Diseño del servicio interoperable", _ind("% de diseños aprobados a la primera", 85)),
    ]),
    ("M2", "Implementación de servicios de interoperabilidad", [
        ("M2.1", "Gestión de solicitudes de interoperabilidad", _ind("Tiempo promedio de atención de solicitudes", 5, "Descendente", "días")),
        ("M2.2", "Diseño y configuración de la integración", _ind("% de integraciones configuradas sin retrabajo", 90)),
        ("M2.3", "Ejecución de pruebas de interoperabilidad", _ind("% de pruebas de interoperabilidad exitosas", 95)),
    ]),
    ("M3", "Integración de sistemas", [
        ("M3.1", "Análisis y especificación de la integración", _ind("% de especificaciones completas y aprobadas", 90)),
        ("M3.2", "Desarrollo y configuración del middleware/API", _ind("% de servicios/API entregados a tiempo", 90)),
        ("M3.3", "Pruebas y aseguramiento de interoperabilidad", _ind("% de defectos de interoperabilidad resueltos", 95)),
    ]),
    ("M4", "Orquestación de servicios interoperables", [
        ("M4.1", "Planificación de la orquestación", _ind("% de flujos de orquestación planificados", 90)),
        ("M4.2", "Configuración de servicios interoperables", _ind("% de servicios configurados correctamente", 90)),
        ("M4.3", "Ejecución de servicios interoperables", _ind("Disponibilidad de servicios interoperables", 95)),
    ]),
]


class InventarioService:
    """CRUD del inventario jerárquico de procesos (Anexo 1)."""

    # ------------------------------------------------------------------ #
    # Lectura                                                            #
    # ------------------------------------------------------------------ #

    @staticmethod
    def arbol(session: Session) -> dict:
        org = OrganizacionService.actual(session)
        procesos = session.exec(
            select(Proceso).where(
                Proceso.organizacion_id == org.id,
                Proceso.activo == True,  # noqa: E712
            )
        ).all()

        con_ficha = set(session.exec(
            select(FichaProceso.proceso_id)
        ).all())
        indicadores = session.exec(
            select(FichaIndicador.proceso_id).where(FichaIndicador.activo == True)  # noqa: E712
        ).all()
        num_indicadores: dict[int, int] = {}
        for pid in indicadores:
            num_indicadores[pid] = num_indicadores.get(pid, 0) + 1

        nodos = {
            p.id: {
                "id": p.id,
                "codigo": p.codigo,
                "nombre": p.nombre,
                "producto": p.producto,
                "base_legal": p.base_legal,
                "nivel": p.nivel,
                "codigo_padre": p.codigo_padre,
                "tiene_ficha": p.id in con_ficha,
                "num_indicadores": num_indicadores.get(p.id, 0),
                "hijos": [],
            }
            for p in procesos
        }

        por_codigo = {p.codigo: nodos[p.id] for p in procesos}
        raices: list[dict] = []
        for p in procesos:
            nodo = nodos[p.id]
            padre = por_codigo.get(p.codigo_padre) if p.codigo_padre else None
            if padre:
                padre["hijos"].append(nodo)
            else:
                raices.append(nodo)

        _ordenar(raices)
        return {"tiene_datos": len(procesos) > 0, "arbol": raices}

    # ------------------------------------------------------------------ #
    # Escritura                                                          #
    # ------------------------------------------------------------------ #

    @staticmethod
    def crear(session: Session, datos: dict) -> Proceso:
        org = OrganizacionService.actual(session)
        codigo = (datos.get("codigo") or "").strip().upper()
        nombre = (datos.get("nombre") or "").strip()
        if not codigo:
            raise ErrorValidacion("El código del proceso es obligatorio")
        if not nombre:
            raise ErrorValidacion("El nombre del proceso es obligatorio")

        if InventarioService._buscar_por_codigo(session, org.id, codigo):
            raise ErrorValidacion(f"Ya existe un proceso con el código '{codigo}'")

        codigo_padre = (datos.get("codigo_padre") or "").strip().upper() or None
        nivel = InventarioService._resolver_nivel(session, org.id, codigo_padre)

        proceso = Proceso(
            organizacion_id=org.id,
            codigo=codigo,
            nombre=nombre,
            producto=(datos.get("producto") or "").strip() or None,
            base_legal=(datos.get("base_legal") or "").strip() or None,
            nivel=nivel,
            codigo_padre=codigo_padre,
        )
        session.add(proceso)
        session.commit()
        session.refresh(proceso)
        return proceso

    @staticmethod
    def actualizar(session: Session, proceso_id: int, datos: dict) -> Proceso:
        org = OrganizacionService.actual(session)
        proceso = session.get(Proceso, proceso_id)
        if proceso is None or not proceso.activo or proceso.organizacion_id != org.id:
            raise ErrorValidacion("El proceso no existe")

        if "codigo" in datos:
            codigo = (datos.get("codigo") or "").strip().upper()
            if not codigo:
                raise ErrorValidacion("El código del proceso es obligatorio")
            existente = InventarioService._buscar_por_codigo(session, org.id, codigo)
            if existente and existente.id != proceso.id:
                raise ErrorValidacion(f"Ya existe un proceso con el código '{codigo}'")
            proceso.codigo = codigo

        if "codigo_padre" in datos:
            codigo_padre = (datos.get("codigo_padre") or "").strip().upper() or None
            if codigo_padre == proceso.codigo:
                raise ErrorValidacion("Un proceso no puede ser su propio padre")
            proceso.codigo_padre = codigo_padre
            proceso.nivel = InventarioService._resolver_nivel(session, org.id, codigo_padre)

        if "nombre" in datos:
            nombre = (datos.get("nombre") or "").strip()
            if not nombre:
                raise ErrorValidacion("El nombre del proceso es obligatorio")
            proceso.nombre = nombre
        if "producto" in datos:
            proceso.producto = (datos.get("producto") or "").strip() or None
        if "base_legal" in datos:
            proceso.base_legal = (datos.get("base_legal") or "").strip() or None

        session.add(proceso)
        session.commit()
        session.refresh(proceso)
        return proceso

    @staticmethod
    def eliminar(session: Session, proceso_id: int) -> None:
        org = OrganizacionService.actual(session)
        proceso = session.get(Proceso, proceso_id)
        if proceso is None or not proceso.activo or proceso.organizacion_id != org.id:
            raise ErrorValidacion("El proceso no existe")

        hijos = session.exec(
            select(Proceso).where(
                Proceso.codigo_padre == proceso.codigo,
                Proceso.activo == True,  # noqa: E712
            )
        ).first()
        if hijos:
            raise ErrorValidacion(
                "Este proceso tiene subprocesos. Elimina o reubica los subprocesos primero"
            )

        proceso.activo = False
        session.add(proceso)
        session.commit()

    @staticmethod
    def cargar_plantilla(session: Session) -> int:
        """
        Precarga los macroprocesos M1–M4, sus procesos y un indicador sugerido
        por proceso. Omite los que ya existen (idempotente). Devuelve el número
        de procesos creados.
        """
        org = OrganizacionService.actual(session)
        creados = 0
        for codigo_macro, nombre_macro, hijos in PLANTILLA_INTEROPERABILIDAD:
            if not InventarioService._buscar_por_codigo(session, org.id, codigo_macro):
                session.add(Proceso(
                    organizacion_id=org.id, codigo=codigo_macro,
                    nombre=nombre_macro, nivel=0, codigo_padre=None,
                ))
                creados += 1
            for codigo_hijo, nombre_hijo, indicador in hijos:
                if InventarioService._buscar_por_codigo(session, org.id, codigo_hijo):
                    continue
                proceso = Proceso(
                    organizacion_id=org.id, codigo=codigo_hijo,
                    nombre=nombre_hijo, nivel=1, codigo_padre=codigo_macro,
                )
                session.add(proceso)
                creados += 1
                if indicador:
                    session.flush()  # obtiene proceso.id sin cerrar la transacción
                    session.add(FichaIndicador(proceso_id=proceso.id, **indicador))
        session.commit()
        return creados

    # ------------------------------------------------------------------ #
    # Helpers                                                            #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _buscar_por_codigo(session: Session, org_id: int, codigo: str) -> Proceso | None:
        return session.exec(
            select(Proceso).where(
                Proceso.organizacion_id == org_id,
                Proceso.codigo == codigo,
                Proceso.activo == True,  # noqa: E712
            )
        ).first()

    @staticmethod
    def _resolver_nivel(session: Session, org_id: int, codigo_padre: str | None) -> int:
        if not codigo_padre:
            return 0
        padre = InventarioService._buscar_por_codigo(session, org_id, codigo_padre)
        if padre is None:
            raise ErrorValidacion(f"El proceso padre '{codigo_padre}' no existe")
        nivel = padre.nivel + 1
        if nivel > NIVEL_MAXIMO:
            raise ErrorValidacion(f"No se admiten más de {NIVEL_MAXIMO + 1} niveles de proceso")
        return nivel


def _ordenar(nodos: list[dict]) -> None:
    nodos.sort(key=lambda n: n["codigo"])
    for nodo in nodos:
        _ordenar(nodo["hijos"])

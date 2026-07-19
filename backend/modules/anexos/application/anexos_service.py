from datetime import date

from sqlmodel import Session, select

from modules.fichas.application.errores import ErrorValidacion
from modules.fichas.application.ficha_proceso_service import FichaProcesoService
from modules.fichas.application.indicador_service import IndicadorService
from modules.fichas.application.inventario_service import InventarioService
from modules.fichas.application.organizacion_service import OrganizacionService
from modules.fichas.infrastructure.models import FichaIndicador, FichaProceso, Proceso

# Metadatos de cada anexo de la Directiva CEPLAN N° 0056-2024. El frontend los
# usa para rotular la vista previa y el encabezado del documento impreso.
ANEXOS = {
    1: {
        "titulo": "Inventario de Productos y Procesos",
        "subtitulo": "Relación jerárquica de macroprocesos, procesos y actividades",
        "alcance": "organizacion",
    },
    2: {
        "titulo": "Ficha de Producto y Proceso",
        "subtitulo": "Caracterización SIPOC: proveedores, entradas, salidas y receptores",
        "alcance": "proceso",
    },
    4: {
        "titulo": "Ficha de Indicadores",
        "subtitulo": "Definición, meta y medición mensual de los indicadores del proceso",
        "alcance": "proceso",
    },
}

# Etiquetas de nivel del Anexo 1 (Nivel 0 → 3)
NIVELES = ["Macroproceso", "Proceso", "Subproceso", "Actividad"]


class AnexosService:
    """
    Arma los anexos de la Directiva CEPLAN N° 0056-2024 con la forma exacta que
    necesita la vista previa imprimible: un encabezado institucional común más
    las filas ya resueltas. No agrega datos nuevos —lee el inventario, las
    fichas SIPOC y los indicadores que el usuario ya cargó— para que el anexo
    sea siempre un reflejo fiel del sistema.
    """

    # ------------------------------------------------------------------ #
    # Índice                                                             #
    # ------------------------------------------------------------------ #

    @staticmethod
    def indice(session: Session) -> dict:
        """Qué anexos se pueden emitir hoy y con qué grado de completitud."""
        org = OrganizacionService.actual(session)
        procesos = AnexosService._procesos(session, org.id)
        proceso_ids = {p.id for p in procesos}

        con_ficha = {
            pid for pid in session.exec(select(FichaProceso.proceso_id)).all()
            if pid in proceso_ids
        }
        con_indicador = {
            ind.proceso_id for ind in session.exec(
                select(FichaIndicador).where(FichaIndicador.activo == True)  # noqa: E712
            ).all()
            if ind.proceso_id in proceso_ids
        }

        total = len(procesos)
        return {
            "organizacion": AnexosService._encabezado(org),
            "total_procesos": total,
            "anexos": [
                {
                    "numero": 1,
                    **ANEXOS[1],
                    "disponible": total > 0,
                    "completos": total,
                    "total": total,
                    "detalle": f"{total} proceso(s) en el inventario",
                },
                {
                    "numero": 2,
                    **ANEXOS[2],
                    "disponible": len(con_ficha) > 0,
                    "completos": len(con_ficha),
                    "total": total,
                    "detalle": f"{len(con_ficha)} de {total} proceso(s) con ficha SIPOC",
                },
                {
                    "numero": 4,
                    **ANEXOS[4],
                    "disponible": len(con_indicador) > 0,
                    "completos": len(con_indicador),
                    "total": total,
                    "detalle": f"{len(con_indicador)} de {total} proceso(s) con indicadores",
                },
            ],
            "procesos": [
                {
                    "codigo": p.codigo,
                    "nombre": p.nombre,
                    "nivel": p.nivel,
                    "tiene_ficha": p.id in con_ficha,
                    "tiene_indicadores": p.id in con_indicador,
                }
                for p in procesos
            ],
        }

    # ------------------------------------------------------------------ #
    # Anexo 1 — Inventario de Productos y Procesos                       #
    # ------------------------------------------------------------------ #

    @staticmethod
    def anexo1(session: Session) -> dict:
        org = OrganizacionService.actual(session)
        arbol = InventarioService.arbol(session)["arbol"]

        filas = []
        for nodo in _aplanar(arbol):
            filas.append({
                "codigo": nodo["codigo"],
                "nivel": nodo["nivel"],
                "nivel_etiqueta": NIVELES[nodo["nivel"]] if nodo["nivel"] < len(NIVELES) else "Actividad",
                "nombre": nodo["nombre"],
                "producto": nodo["producto"] or "—",
                "base_legal": nodo["base_legal"] or "—",
                "codigo_padre": nodo["codigo_padre"] or "—",
                "num_indicadores": nodo["num_indicadores"],
                "tiene_ficha": nodo["tiene_ficha"],
            })

        return {
            **AnexosService._cabecera(org, 1),
            "filas": filas,
            "totales": {
                "procesos": len(filas),
                "por_nivel": {
                    NIVELES[n]: sum(1 for f in filas if f["nivel"] == n)
                    for n in range(len(NIVELES))
                },
            },
        }

    # ------------------------------------------------------------------ #
    # Anexo 2 — Ficha de Producto y Proceso (SIPOC)                      #
    # ------------------------------------------------------------------ #

    @staticmethod
    def anexo2(session: Session, codigo: str) -> dict:
        org = OrganizacionService.actual(session)
        ficha = FichaProcesoService.obtener(session, codigo)

        # El SIPOC se imprime como una tabla de 5 columnas; las listas tienen
        # largos distintos, así que se rellenan al largo de la más larga.
        columnas = ["proveedores", "entradas", "salidas", "receptores"]
        alto = max([len(ficha.get(c) or []) for c in columnas] + [1])
        sipoc = [
            {c: (ficha.get(c) or [])[i] if i < len(ficha.get(c) or []) else "" for c in columnas}
            for i in range(alto)
        ]

        return {
            **AnexosService._cabecera(org, 2),
            "proceso": {
                "codigo": ficha["codigo"],
                "nombre": ficha["nombre_proceso"],
                "producto": ficha["producto"] or "—",
                "tipo": ficha["tipo"] or "—",
                "dueno": ficha["dueno"] or "—",
                "objetivo": ficha["objetivo"] or "—",
                "objetivo_estrategico": ficha["objetivo_estrategico"] or "—",
            },
            "tiene_ficha": ficha["tiene_ficha"],
            "sipoc": sipoc,
            "actividades": ficha["actividades"] or [],
            "riesgos": ficha["riesgos"] or [],
            "registros": ficha["registros"] or [],
            "firmas": {
                "elaborado_por": ficha["elaborado_por"] or "",
                "revisado_por": ficha["revisado_por"] or "",
                "aprobado_por": ficha["aprobado_por"] or "",
            },
        }

    # ------------------------------------------------------------------ #
    # Anexo 4 — Ficha de Indicadores                                     #
    # ------------------------------------------------------------------ #

    @staticmethod
    def anexo4(session: Session, codigo: str) -> dict:
        org = OrganizacionService.actual(session)
        proceso = AnexosService._resolver(session, org.id, codigo)
        indicadores = IndicadorService.listar(session, codigo)

        return {
            **AnexosService._cabecera(org, 4),
            "proceso": {"codigo": proceso.codigo, "nombre": proceso.nombre},
            "indicadores": [
                {
                    "nombre": ind["nombre"],
                    "tipo": ind["tipo"] or "—",
                    "sentido": ind["sentido"],
                    "unidad": ind["unidad"] or "—",
                    "formula": ind["formula"] or "—",
                    "fuente": ind["fuente"] or "—",
                    "responsable": ind["responsable"] or "—",
                    "linea_base": ind["linea_base"],
                    "meta_final": ind["meta_final"],
                    "relevancia": ind["relevancia"],
                    "objetivo_estrategico": ind["objetivo_estrategico"] or "—",
                    "accion_estrategica": ind["accion_estrategica"] or "—",
                    "mediciones": ind["mediciones"],
                }
                for ind in indicadores
            ],
        }

    # ------------------------------------------------------------------ #
    # Helpers                                                            #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _cabecera(org, numero: int) -> dict:
        return {
            "anexo": numero,
            "titulo": ANEXOS[numero]["titulo"],
            "subtitulo": ANEXOS[numero]["subtitulo"],
            "organizacion": AnexosService._encabezado(org),
        }

    @staticmethod
    def _encabezado(org) -> dict:
        return {
            "nombre": org.nombre,
            "sector": org.sector or "—",
            "emitido_el": date.today().isoformat(),
            "directiva": "Directiva CEPLAN N° 0056-2024",
        }

    @staticmethod
    def _procesos(session: Session, org_id: int) -> list[Proceso]:
        procesos = session.exec(
            select(Proceso).where(
                Proceso.organizacion_id == org_id,
                Proceso.activo == True,  # noqa: E712
            )
        ).all()
        return sorted(procesos, key=lambda p: p.codigo)

    @staticmethod
    def _resolver(session: Session, org_id: int, codigo: str) -> Proceso:
        proceso = session.exec(
            select(Proceso).where(
                Proceso.organizacion_id == org_id,
                Proceso.codigo == (codigo or "").strip().upper(),
                Proceso.activo == True,  # noqa: E712
            )
        ).first()
        if proceso is None:
            raise ErrorValidacion(f"El proceso '{codigo}' no existe")
        return proceso


def _aplanar(nodos: list[dict]) -> list[dict]:
    """Recorre el árbol en preorden para que el anexo se imprima jerárquicamente."""
    filas = []
    for nodo in nodos:
        filas.append(nodo)
        filas.extend(_aplanar(nodo["hijos"]))
    return filas

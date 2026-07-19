from sqlmodel import Session, select

from modules.fichas.application.organizacion_service import OrganizacionService
from modules.fichas.infrastructure.models import (
    AccionCambio,
    Causa,
    FichaIndicador,
    FichaProceso,
    Medicion,
    Oportunidad,
    Proceso,
    Proyeccion,
)

# Fases del trabajo del curso, en el orden en que se ejecutaron. Cada una
# declara qué métrica del sistema es su evidencia: la bitácora no narra lo que
# "debería" haberse hecho, sino lo que quedó registrado en la plataforma.
FASES = [
    {
        "clave": "alcance",
        "numero": 1,
        "titulo": "Definición del alcance institucional",
        "metodologia": "Directiva CEPLAN N° 0056-2024",
        "entregable": "Identificación de la entidad y su sector",
        "que_se_hizo": (
            "Se delimitó la entidad sobre la que se trabaja y el sector al que pertenece, "
            "para acotar qué procesos entran en el alcance de la interoperabilidad."
        ),
        "metrica": "organizacion",
        "meta": 1,
        "ruta": "/onboarding",
        "icono": "apartment",
    },
    {
        "clave": "inventario",
        "numero": 2,
        "titulo": "Inventario de productos y procesos",
        "metodologia": "Anexo 1 — jerarquía Nivel 0 a Nivel 3",
        "entregable": "Anexo 1",
        "que_se_hizo": (
            "Se levantó el catálogo jerárquico de macroprocesos, procesos y actividades "
            "de la entidad, asignando código y producto a cada uno."
        ),
        "metrica": "procesos",
        "meta": 4,
        "ruta": "/anexos?anexo=1",
        "icono": "account_tree",
    },
    {
        "clave": "caracterizacion",
        "numero": 3,
        "titulo": "Caracterización de procesos (SIPOC)",
        "metodologia": "Anexo 2 — Proveedores, Entradas, Proceso, Salidas, Clientes",
        "entregable": "Anexo 2",
        "que_se_hizo": (
            "Para cada proceso se documentó su cadena SIPOC, el dueño del proceso, "
            "las actividades del ciclo PDCA, los riesgos y los registros que genera."
        ),
        "metrica": "fichas",
        "meta": 4,
        "ruta": "/anexos?anexo=2",
        "icono": "description",
    },
    {
        "clave": "indicadores",
        "numero": 4,
        "titulo": "Definición de indicadores",
        "metodologia": "Anexo 4 — eficacia, eficiencia y efectividad",
        "entregable": "Anexo 4",
        "que_se_hizo": (
            "Se definieron los indicadores de cada proceso con su fórmula, sentido, "
            "unidad, línea base, meta final y responsable de la medición."
        ),
        "metrica": "indicadores",
        "meta": 4,
        "ruta": "/anexos?anexo=4",
        "icono": "insights",
    },
    {
        "clave": "medicion",
        "numero": 5,
        "titulo": "Medición y seguimiento mensual",
        "metodologia": "Semáforo CEPLAN sobre el avance tipo I",
        "entregable": "Tablero de control",
        "que_se_hizo": (
            "Se capturó numerador, denominador y resultado esperado mes a mes, "
            "y el sistema calculó el avance T1 y el semáforo de cada indicador."
        ),
        "metrica": "mediciones",
        "meta": 12,
        "ruta": "/tablero",
        "icono": "monitoring",
    },
    {
        "clave": "diagnostico",
        "numero": 6,
        "titulo": "Diagnóstico de causas",
        "metodologia": "Ishikawa 6M + Pareto de causas",
        "entregable": "Diagrama causa-efecto",
        "que_se_hizo": (
            "Sobre los procesos que no alcanzaron su meta se identificaron las causas "
            "agrupadas en las 6M y se priorizaron con Pareto para hallar la causa raíz."
        ),
        "metrica": "causas",
        "meta": 6,
        "ruta": "/resultados",
        "icono": "hub",
    },
    {
        "clave": "oportunidades",
        "numero": 7,
        "titulo": "Priorización de oportunidades de mejora",
        "metodologia": "Factibilidad F = Costo × Impacto y matriz de riesgo",
        "entregable": "Cartera de oportunidades",
        "que_se_hizo": (
            "Cada causa raíz se convirtió en una oportunidad de mejora, evaluada por "
            "factibilidad y riesgo para decidir el plazo de la acción."
        ),
        "metrica": "oportunidades",
        "meta": 4,
        "ruta": "/resultados",
        "icono": "lightbulb",
    },
    {
        "clave": "proyeccion",
        "numero": 8,
        "titulo": "Proyección del efecto de la mejora",
        "metodologia": "Comparación antes / después contra la meta",
        "entregable": "Escenario proyectado",
        "que_se_hizo": (
            "Se proyectó mes a mes el comportamiento esperado del indicador tras aplicar "
            "la mejora, para estimar cuándo alcanzaría la meta."
        ),
        "metrica": "proyecciones",
        "meta": 2,
        "ruta": "/resultados",
        "icono": "trending_up",
    },
    {
        "clave": "cambio",
        "numero": 9,
        "titulo": "Gestión del cambio",
        "metodologia": "Modelo de Kurt Lewin — descongelar, cambiar, recongelar",
        "entregable": "Plan de acciones de cambio",
        "que_se_hizo": (
            "Se planificaron las acciones necesarias para implantar la mejora y sostenerla, "
            "asignando responsable, fecha y estado a cada una."
        ),
        "metrica": "acciones_cambio",
        "meta": 3,
        "ruta": "/resultados",
        "icono": "published_with_changes",
    },
]


class BitacoraService:
    """
    Bitácora del trabajo: narra las fases del proyecto y adjunta como evidencia
    los datos reales que hay en el sistema en ese momento.

    El estado de cada fase no se marca a mano —se deriva de si existen o no los
    registros que esa fase debía producir—, así que la bitácora nunca queda
    desincronizada de lo que realmente se hizo.
    """

    @staticmethod
    def obtener(session: Session) -> dict:
        org = OrganizacionService.actual(session)
        conteos = BitacoraService._conteos(session, org.id)

        fases = []
        for fase in FASES:
            hecho = conteos.get(fase["metrica"], 0)
            fases.append({
                **{k: v for k, v in fase.items() if k != "metrica"},
                "evidencia": {
                    "cantidad": hecho,
                    "meta_referencial": fase["meta"],
                    "etiqueta": _ETIQUETAS[fase["metrica"]](hecho),
                },
                "estado": BitacoraService._estado(hecho, fase["meta"]),
            })

        completadas = sum(1 for f in fases if f["estado"] == "completada")
        en_curso = sum(1 for f in fases if f["estado"] == "en_curso")

        return {
            "organizacion": {"nombre": org.nombre, "sector": org.sector},
            "progreso": {
                "total": len(fases),
                "completadas": completadas,
                "en_curso": en_curso,
                "pendientes": len(fases) - completadas - en_curso,
                "porcentaje": round(completadas / len(fases) * 100, 1),
            },
            "fases": fases,
        }

    # ------------------------------------------------------------------ #
    # Evidencia                                                          #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _conteos(session: Session, org_id: int) -> dict[str, int]:
        procesos = session.exec(
            select(Proceso).where(
                Proceso.organizacion_id == org_id,
                Proceso.activo == True,  # noqa: E712
            )
        ).all()
        proceso_ids = {p.id for p in procesos}

        def de_procesos(modelo) -> int:
            filas = session.exec(
                select(modelo.proceso_id).where(modelo.activo == True)  # noqa: E712
            ).all()
            return sum(1 for pid in filas if pid in proceso_ids)

        indicadores = [
            ind for ind in session.exec(
                select(FichaIndicador).where(FichaIndicador.activo == True)  # noqa: E712
            ).all()
            if ind.proceso_id in proceso_ids
        ]
        indicador_ids = {ind.id for ind in indicadores}

        mediciones = sum(
            1 for iid in session.exec(select(Medicion.indicador_id)).all()
            if iid in indicador_ids
        )
        proyecciones = sum(
            1 for iid in session.exec(select(Proyeccion.indicador_id)).all()
            if iid in indicador_ids
        )
        fichas = sum(
            1 for pid in session.exec(select(FichaProceso.proceso_id)).all()
            if pid in proceso_ids
        )

        return {
            "organizacion": 1,  # resuelta siempre: la fase 1 se cierra al existir la entidad
            "procesos": len(procesos),
            "fichas": fichas,
            "indicadores": len(indicadores),
            "mediciones": mediciones,
            "causas": de_procesos(Causa),
            "oportunidades": de_procesos(Oportunidad),
            "proyecciones": proyecciones,
            "acciones_cambio": de_procesos(AccionCambio),
        }

    @staticmethod
    def _estado(hecho: int, meta: int) -> str:
        if hecho == 0:
            return "pendiente"
        return "completada" if hecho >= meta else "en_curso"


_ETIQUETAS = {
    "organizacion": lambda n: "Entidad registrada" if n else "Sin registrar",
    "procesos": lambda n: f"{n} proceso(s) en el inventario",
    "fichas": lambda n: f"{n} ficha(s) SIPOC completadas",
    "indicadores": lambda n: f"{n} indicador(es) definidos",
    "mediciones": lambda n: f"{n} medición(es) mensuales capturadas",
    "causas": lambda n: f"{n} causa(s) identificadas",
    "oportunidades": lambda n: f"{n} oportunidad(es) priorizadas",
    "proyecciones": lambda n: f"{n} indicador(es) con escenario proyectado",
    "acciones_cambio": lambda n: f"{n} acción(es) de cambio planificadas",
}

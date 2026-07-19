from sqlmodel import Session

from modules.analisis.application.contexto_service import ContextoService
from modules.fichas.application.causa_service import CATEGORIAS_6M
from modules.fichas.application.errores import ErrorValidacion
from modules.fichas.application.proceso_lookup import resolver_proceso
from shared.ia import completar, completar_json, disponible

_ROL = """Eres analista de procesos especializado en la Directiva CEPLAN N° 0056-2024 \
sobre interoperabilidad de servicios públicos del Perú.

Semáforo CEPLAN sobre el avance tipo I:
- Verde: ≥ 95 % — cumplimiento logrado
- Ámbar: 75 % a 95 % — desvío moderado
- Rojo: < 75 % — desvío alto, requiere intervención

Analizas datos reales de una entidad pública. Reglas:
- Fundamenta cada afirmación en los datos que recibes; nunca inventes cifras.
- Cita los procesos por su código (ej. M1.1).
- Sé concreto y accionable: quién, qué y en qué plazo.
- Si los datos son insuficientes para concluir algo, dilo explícitamente."""

# Qué debe mirar la IA en cada sección. Acotar el foco evita que todas las
# secciones devuelvan el mismo análisis genérico.
_FOCO = {
    "tablero": (
        "Evalúa el estado de monitoreo: qué indicadores están fuera de meta, "
        "cuáles retroceden y cuáles están en rojo sin plan de mejora asociado. "
        "Prioriza por urgencia de intervención."
    ),
    "resultados": (
        "Evalúa los resultados obtenidos y el efecto de las mejoras aplicadas: "
        "qué procesos mejoraron, cuáles siguen estancados y si el trabajo de "
        "mejora registrado es proporcional a la brecha que tienen."
    ),
    "pareto": (
        "Interpreta el Pareto: identifica el grupo crítico que concentra el 80 % "
        "del incumplimiento y explica en qué conviene concentrar los recursos y por qué."
    ),
    "predicciones": (
        "Interpreta las proyecciones a diciembre: qué procesos no llegarán a su meta, "
        "cuánto margen de corrección queda y qué confiabilidad tiene cada proyección "
        "según su R² y su número de meses reportados."
    ),
    "mejora": (
        "Evalúa el ciclo de mejora de este proceso: si el diagnóstico de causas es "
        "sólido, si las oportunidades priorizadas atacan la causa raíz y si el plan "
        "de cambio es suficiente para sostener la mejora."
    ),
}

_ESQUEMA_ANALISIS = """{
  "diagnostico": "2 a 3 frases con la lectura general de los datos",
  "hallazgos": [
    {"titulo": "frase corta", "detalle": "explicación con las cifras que lo sustentan",
     "severidad": "alta" | "media" | "baja", "procesos": ["M1.1"]}
  ],
  "recomendaciones": [
    {"accion": "qué hacer, en imperativo", "justificacion": "por qué",
     "prioridad": "alta" | "media" | "baja", "plazo": "inmediato" | "corto plazo" | "mediano plazo",
     "procesos": ["M1.1"]}
  ]
}"""


class AnalisisService:
    """
    Análisis asistido por IA sobre los datos reales del sistema.

    Cada método arma el contexto con `ContextoService`, le da a la IA un foco
    distinto según lo que el usuario está mirando, y devuelve estructura
    (hallazgos, recomendaciones) en vez de prosa suelta, para que el frontend
    pueda renderizarla y priorizarla.
    """

    @staticmethod
    def estado() -> dict:
        return {"disponible": disponible()}

    # ------------------------------------------------------------------ #
    # Análisis por sección                                               #
    # ------------------------------------------------------------------ #

    @staticmethod
    def por_seccion(
        session: Session,
        seccion: str,
        codigo: str | None = None,
        periodo: str | None = None,
    ) -> dict:
        if seccion not in _FOCO:
            raise ErrorValidacion(
                f"Sección '{seccion}' no reconocida. Válidas: {', '.join(_FOCO)}"
            )

        contexto = AnalisisService._contexto(session, seccion, codigo, periodo)
        prompt = (
            f"{_FOCO[seccion]}\n\n"
            f"DATOS:\n{contexto}\n\n"
            f"Devuelve como máximo 4 hallazgos y 4 recomendaciones, con este esquema:\n"
            f"{_ESQUEMA_ANALISIS}"
        )
        resultado = completar_json(_ROL, prompt, max_tokens=1400)
        return {
            "seccion": seccion,
            "codigo": codigo,
            "diagnostico": resultado.get("diagnostico", ""),
            "hallazgos": resultado.get("hallazgos", []),
            "recomendaciones": resultado.get("recomendaciones", []),
        }

    @staticmethod
    def _contexto(session: Session, seccion: str, codigo: str | None, periodo: str | None) -> str:
        if seccion == "tablero":
            return ContextoService.tablero(session, periodo)
        if seccion == "resultados":
            return ContextoService.resultados(session)
        if seccion == "pareto":
            return ContextoService.pareto()
        if seccion == "predicciones":
            return ContextoService.predicciones()
        # mejora
        if not codigo:
            raise ErrorValidacion("El análisis de mejora requiere el código del proceso")
        return ContextoService.mejora(session, codigo)

    # ------------------------------------------------------------------ #
    # Informe ejecutivo global                                           #
    # ------------------------------------------------------------------ #

    @staticmethod
    def informe(session: Session, periodo: str | None = None) -> dict:
        contexto = ContextoService.global_(session, periodo)
        prompt = (
            "Redacta el informe ejecutivo del estado institucional de interoperabilidad, "
            "dirigido a la alta dirección de la entidad. Usa solo los datos entregados.\n\n"
            f"DATOS:\n{contexto}\n\n"
            "Esquema de respuesta:\n"
            """{
  "titulo": "título del informe",
  "resumen_ejecutivo": "3 a 4 frases: dónde está la entidad y qué decisión requiere",
  "secciones": [
    {"titulo": "nombre de la sección", "contenido": "2 a 4 párrafos cortos con cifras"}
  ],
  "riesgos": [{"riesgo": "…", "impacto": "alto"|"medio"|"bajo", "mitigacion": "…"}],
  "prioridades": [{"orden": 1, "accion": "…", "responsable_sugerido": "…", "plazo": "…"}],
  "conclusion": "cierre en 2 frases"
}

Incluye al menos estas secciones: estado general del seguimiento, procesos críticos, \
proyección al cierre del año, y avance del ciclo de mejora."""
        )
        return completar_json(_ROL, prompt, max_tokens=2200)

    # ------------------------------------------------------------------ #
    # Asistencia contextual — onboarding                                 #
    # ------------------------------------------------------------------ #

    @staticmethod
    def sugerir_indicadores(session: Session, codigo: str, cantidad: int = 3) -> dict:
        proceso = resolver_proceso(session, codigo)
        prompt = (
            f"Propón {cantidad} indicadores para este proceso de una entidad pública peruana:\n"
            f"- Código: {proceso.codigo}\n"
            f"- Nombre: {proceso.nombre}\n"
            f"- Producto: {proceso.producto or 'no declarado'}\n\n"
            "Cada indicador debe ser medible mensualmente con numerador y denominador "
            "obtenibles de registros administrativos reales. Varía el tipo entre "
            "eficacia, eficiencia y efectividad.\n\n"
            """Esquema:
{"indicadores": [
  {"nombre": "% de …", "tipo": "eficacia"|"eficiencia"|"efectividad",
   "sentido": "Ascendente"|"Descendente", "unidad": "%"|"días"|"…",
   "formula": "numerador / denominador × 100", "fuente": "de dónde sale el dato",
   "meta_final": 90, "linea_base": 60, "justificacion": "por qué mide bien este proceso"}
]}"""
        )
        return completar_json(_ROL, prompt, max_tokens=1200)

    @staticmethod
    def sugerir_sipoc(session: Session, codigo: str) -> dict:
        proceso = resolver_proceso(session, codigo)
        prompt = (
            "Propón la caracterización SIPOC (Anexo 2) de este proceso de una entidad "
            "pública peruana. Sé concreto y realista para el sector público.\n"
            f"- Código: {proceso.codigo}\n"
            f"- Nombre: {proceso.nombre}\n"
            f"- Producto: {proceso.producto or 'no declarado'}\n\n"
            """Esquema:
{"tipo": "misional"|"estratégico"|"soporte",
 "objetivo": "para qué existe el proceso, en una frase",
 "proveedores": ["…"], "entradas": ["…"], "salidas": ["…"], "receptores": ["…"],
 "actividades": ["verbo en infinitivo + objeto, siguiendo el ciclo P-D-C-A"],
 "riesgos": ["…"], "registros": ["documento o sistema donde queda evidencia"]}

Entre 3 y 5 elementos por lista."""
        )
        return completar_json(_ROL, prompt, max_tokens=1400)

    # ------------------------------------------------------------------ #
    # Asistencia contextual — mejora                                     #
    # ------------------------------------------------------------------ #

    @staticmethod
    def sugerir_causas(session: Session, codigo: str) -> dict:
        contexto = ContextoService.mejora(session, codigo)
        prompt = (
            "Este proceso no alcanzó su meta. Propón las causas probables del bajo "
            "desempeño usando el diagrama de Ishikawa, y para las que sean causa raíz "
            "propón la acción de mejora correspondiente.\n\n"
            f"DATOS:\n{contexto}\n\n"
            f"Categorías válidas (usa exactamente estos nombres): {', '.join(CATEGORIAS_6M)}\n\n"
            """Esquema:
{"causas": [
  {"categoria": "una de las categorías válidas", "descripcion": "la causa, concreta",
   "es_raiz": true|false, "peso": 1-10, "justificacion": "en qué dato te basas"}
 ],
 "oportunidades": [
  {"descripcion": "la oportunidad de mejora", "accion_propuesta": "qué hacer exactamente",
   "costo": 1-5, "impacto": 1-5, "probabilidad": 1-5, "consecuencia": 1-5,
   "estrategia": "evitar"|"mitigar"|"transferir"|"aceptar"}
 ]}

Entre 4 y 6 causas cubriendo al menos 3 categorías, y entre 2 y 4 oportunidades \
que ataquen las causas marcadas como raíz. En costo e impacto, 1 es lo más bajo y \
5 lo más alto; la factibilidad se calcula como costo × impacto."""
        )
        # No se persiste nada: el usuario revisa las propuestas y decide cuáles guardar.
        return completar_json(_ROL, prompt, max_tokens=1800)

    # ------------------------------------------------------------------ #
    # Explicación libre                                                  #
    # ------------------------------------------------------------------ #

    @staticmethod
    def explicar(session: Session, pregunta: str, seccion: str | None = None,
                 codigo: str | None = None) -> str:
        """Respuesta en prosa a una pregunta puntual sobre la sección que se está viendo."""
        contexto = (
            AnalisisService._contexto(session, seccion, codigo, None)
            if seccion in _FOCO
            else ContextoService.resumen_procesos()
        )
        return completar(
            _ROL,
            [{"role": "user", "content": f"DATOS:\n{contexto}\n\nPREGUNTA: {pregunta}"}],
            max_tokens=700,
        )

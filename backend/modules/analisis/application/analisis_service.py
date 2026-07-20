from sqlmodel import Session, select

from modules.analisis.application.contexto_service import ContextoService
from modules.analisis.application.informe_service import InformeService
from modules.fichas.application.cambio_service import ETAPAS, CambioService
from modules.fichas.application.causa_service import CATEGORIAS_6M, CausaService
from modules.fichas.application.comparacion_service import ComparacionService
from modules.fichas.application.errores import ErrorValidacion
from modules.fichas.application.oportunidad_service import (
    ESTRATEGIAS,
    OportunidadService,
)
from modules.fichas.application.proceso_lookup import resolver_proceso
from modules.fichas.infrastructure.models import FichaIndicador
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

# Los tres informes (ejecutivo, por módulo y comparativo) comparten formato para
# que el frontend los renderice y los imprima con el mismo componente.
_ESQUEMA_INFORME = """{
  "titulo": "título del informe",
  "resumen_ejecutivo": "3 a 4 frases: dónde se está y qué decisión se requiere",
  "secciones": [
    {"titulo": "nombre de la sección", "contenido": "2 a 4 párrafos cortos con cifras"}
  ],
  "riesgos": [{"riesgo": "…", "impacto": "alto"|"medio"|"bajo", "mitigacion": "…"}],
  "prioridades": [{"orden": 1, "accion": "…", "responsable_sugerido": "…", "plazo": "…"}],
  "conclusion": "cierre en 2 frases"
}"""


def clave_seccion(seccion: str, codigo: str | None, periodo: str | None) -> str:
    """
    Alcance con el que se archiva un análisis de sección. Incluye proceso y
    periodo porque el análisis del tablero de S1 no es el mismo que el de S2 ni
    el de la mejora de M1.1 el mismo que el de M2.3.
    """
    return f"{seccion}|{codigo or ''}|{periodo or ''}"


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
        analisis = {
            "seccion": seccion,
            "codigo": codigo,
            "diagnostico": resultado.get("diagnostico", ""),
            "hallazgos": resultado.get("hallazgos", []),
            "recomendaciones": resultado.get("recomendaciones", []),
        }
        InformeService.guardar(
            session, "seccion", analisis,
            alcance=clave_seccion(seccion, codigo, periodo), periodo=periodo,
        )
        return analisis

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
    # Informes                                                           #
    # ------------------------------------------------------------------ #

    @staticmethod
    def informe(session: Session, periodo: str | None = None) -> dict:
        contexto = ContextoService.global_(session, periodo)
        prompt = (
            "Redacta el informe ejecutivo del estado institucional de interoperabilidad, "
            "dirigido a la alta dirección de la entidad. Usa solo los datos entregados.\n\n"
            f"DATOS:\n{contexto}\n\n"
            f"Esquema de respuesta:\n{_ESQUEMA_INFORME}\n\n"
            "Incluye al menos estas secciones: estado general del seguimiento, procesos "
            "críticos, proyección al cierre del año, y avance del ciclo de mejora."
        )
        redactado = completar_json(_ROL, prompt, max_tokens=2200)
        InformeService.guardar(session, "ejecutivo", redactado, periodo=periodo)
        return redactado

    @staticmethod
    def informe_modulo(session: Session, modulo: str, periodo: str | None = None) -> dict:
        """
        Informe de un macroproceso (M1, M2, M3, M4). Mismo formato que el
        ejecutivo, pero acotado a los procesos del módulo: es el nivel al que
        responde el responsable del macroproceso, no la alta dirección.
        """
        modulo = (modulo or "").strip().upper()
        disponibles = ContextoService.modulos_disponibles()
        if modulo not in disponibles:
            raise ErrorValidacion(
                f"Módulo '{modulo}' sin datos. Disponibles: {', '.join(disponibles) or 'ninguno'}"
            )

        contexto = ContextoService.modulo(session, modulo)
        prompt = (
            f"Redacta el informe de gestión del macroproceso {modulo}, dirigido a su "
            "responsable. Usa solo los datos entregados y céntrate exclusivamente en "
            "los procesos de este módulo; no hables de la entidad en general.\n\n"
            f"DATOS:\n{contexto}\n\n"
            f"Esquema de respuesta:\n{_ESQUEMA_INFORME}\n\n"
            f"Incluye al menos estas secciones: desempeño del módulo {modulo} y de cada "
            "uno de sus procesos, procesos que arrastran el resultado del módulo, "
            "proyección al cierre del año, y estado del ciclo de mejora del módulo."
        )
        redactado = completar_json(_ROL, prompt, max_tokens=2200)
        InformeService.guardar(session, "modulo", redactado, alcance=modulo, periodo=periodo)
        return redactado

    @staticmethod
    def informe_comparativa(session: Session, codigos: list[str]) -> dict:
        """Informe que explica en qué se diferencian los procesos comparados."""
        elegidos = [c.strip().upper() for c in codigos if (c or "").strip()]
        if len(elegidos) < 2:
            raise ErrorValidacion("La comparativa necesita al menos 2 procesos")

        contexto = ContextoService.comparativa(elegidos)
        prompt = (
            "Redacta el informe comparativo de los procesos seleccionados. Explica en "
            "qué se diferencian entre sí: quién lidera, quién queda atrás, si la brecha "
            "se abre o se cierra con los meses, y qué prácticas del proceso líder "
            "convendría replicar en los rezagados. Usa solo los datos entregados y "
            "compara siempre entre ellos, no contra el resto de la entidad.\n\n"
            f"DATOS:\n{contexto}\n\n"
            f"Esquema de respuesta:\n{_ESQUEMA_INFORME}\n\n"
            "Incluye al menos estas secciones: ranking y lectura general, evolución de "
            "la brecha mes a mes, y qué replicar del proceso con mejor desempeño."
        )
        redactado = completar_json(_ROL, prompt, max_tokens=2200)
        InformeService.guardar(
            session, "comparativa", redactado, alcance=",".join(sorted(elegidos)),
        )
        return redactado

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
    # Mejora completa — las 4 partes de un tirón                         #
    # ------------------------------------------------------------------ #

    @staticmethod
    def completar_mejora(session: Session, codigo: str) -> dict:
        """
        Propone el ciclo de mejora completo del proceso: diagnóstico Ishikawa,
        oportunidades (F=C×I), gestión del cambio (Lewin) y —de forma
        determinista, no inventada por la IA— la proyección Antes/Después.

        No persiste nada: devuelve la propuesta para que el usuario la revise y
        la aplique con `aplicar_mejora`.
        """
        proceso = resolver_proceso(session, codigo)
        contexto = ContextoService.mejora(session, codigo)
        prompt = (
            "Este proceso no alcanzó su meta. Diseña su ciclo de mejora COMPLETO "
            "en cuatro partes coherentes entre sí: (1) diagnóstico de causas con "
            "Ishikawa, (2) oportunidades de mejora que ataquen las causas raíz, "
            "(3) plan de gestión del cambio de Kurt Lewin, y (4) una breve nota "
            "que justifique la proyección de mejora.\n\n"
            f"DATOS:\n{contexto}\n\n"
            f"Categorías Ishikawa válidas (usa exactamente estos nombres): {', '.join(CATEGORIAS_6M)}\n"
            f"Estrategias de oportunidad válidas: {', '.join(ESTRATEGIAS)}\n"
            f"Etapas de Lewin válidas (usa exactamente estos nombres): {', '.join(ETAPAS)}\n\n"
            """Esquema:
{"causas": [
  {"categoria": "una categoría válida", "descripcion": "la causa, concreta",
   "es_raiz": true|false, "peso": 1-10, "justificacion": "en qué dato te basas"}
 ],
 "oportunidades": [
  {"descripcion": "la oportunidad", "accion_propuesta": "qué hacer exactamente",
   "costo": 1-5, "impacto": 1-5, "probabilidad": 1-5, "consecuencia": 1-5,
   "estrategia": "una estrategia válida"}
 ],
 "cambio": [
  {"etapa": "una etapa válida", "descripcion": "acción concreta del plan",
   "responsable": "rol sugerido"}
 ],
 "proyeccion_nota": "1-2 frases: cómo la mejora cierra la brecha hasta la meta"}

Reglas: 4 a 6 causas cubriendo al menos 3 categorías; 2 a 4 oportunidades que \
ataquen las causas raíz; al menos una acción de cambio por cada etapa de Lewin \
(descongelar, cambiar, recongelar). En costo e impacto 1 es lo más bajo y 5 lo más \
alto; la factibilidad es costo × impacto."""
        )
        propuesta = completar_json(_ROL, prompt, max_tokens=2200)
        propuesta["proyeccion"] = AnalisisService._proyeccion_sugerida(
            session, proceso.id, propuesta.get("proyeccion_nota")
        )
        return propuesta

    @staticmethod
    def aplicar_mejora(session: Session, codigo: str, propuesta: dict) -> dict:
        """
        Persiste la propuesta de mejora ya revisada por el usuario. Se aplican
        solo las partes presentes en `propuesta`, reutilizando los servicios de
        cada módulo para respetar sus validaciones.
        """
        resolver_proceso(session, codigo)  # valida que el proceso exista
        resumen = {"causas": 0, "oportunidades": 0, "cambio": 0, "proyeccion": False}

        for causa in propuesta.get("causas", []):
            if (causa.get("categoria") in CATEGORIAS_6M) and (causa.get("descripcion") or "").strip():
                CausaService.crear(session, codigo, causa)
                resumen["causas"] += 1

        for op in propuesta.get("oportunidades", []):
            if (op.get("descripcion") or "").strip():
                OportunidadService.crear(session, codigo, op)
                resumen["oportunidades"] += 1

        for accion in propuesta.get("cambio", []):
            if (accion.get("etapa") in ETAPAS) and (accion.get("descripcion") or "").strip():
                CambioService.crear(session, codigo, accion)
                resumen["cambio"] += 1

        proyeccion = propuesta.get("proyeccion") or {}
        indicador_id = proyeccion.get("indicador_id")
        meses = proyeccion.get("meses") or []
        if indicador_id and meses:
            ComparacionService.guardar_proyeccion(session, indicador_id, {
                "meses": meses,
                "nota": proyeccion.get("nota"),
            })
            resumen["proyeccion"] = True

        return {"codigo": codigo, "aplicado": resumen}

    @staticmethod
    def _proyeccion_sugerida(session: Session, proceso_id: int, nota: str | None) -> dict:
        """Rampa determinista hasta la meta para el indicador principal del proceso."""
        indicador = session.exec(
            select(FichaIndicador).where(
                FichaIndicador.proceso_id == proceso_id,
                FichaIndicador.activo == True,  # noqa: E712
            )
        ).first()
        if indicador is None:
            return {"indicador_id": None, "meses": [], "nota": nota}
        try:
            sugerida = ComparacionService.sugerir_proyeccion(session, indicador.id)
        except ErrorValidacion:
            # Sin mediciones o sin meta no se puede trazar la rampa; se omite.
            return {"indicador_id": indicador.id, "indicador": indicador.nombre, "meses": [], "nota": nota}
        return {
            "indicador_id": indicador.id,
            "indicador": indicador.nombre,
            "meses": sugerida["meses"],
            "nota": nota,
        }

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

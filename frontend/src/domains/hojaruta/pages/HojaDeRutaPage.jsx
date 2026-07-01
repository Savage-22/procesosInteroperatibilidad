import { Link } from 'react-router-dom'

const FASES = [
    {
        numero: '01',
        modulo: 'M1',
        color: 'blue',
        icono: 'search',
        titulo: 'Identificación de Servicios',
        subtitulo: 'Diseño de Servicios Públicos Interoperables',
        descripcion:
            'El punto de partida es conocer exactamente qué servicios presta la institución, quiénes los necesitan y qué información se intercambia entre entidades del Estado para prestarlos.',
        actividades: [
            'Mapear todos los servicios públicos de la institución',
            'Identificar los ciudadanos y entidades que los usan',
            'Listar los datos que se comparten con otras entidades',
            'Detectar redundancias y cuellos de botella en los trámites',
        ],
        criterio: 'Un servicio es interoperable cuando puede intercambiar datos con otras entidades sin intervención manual.',
        enlace: null,
        enSIIP: 'SIIP muestra el avance T1 del módulo M1 y alerta cuando los indicadores de diseño no alcanzan la meta.',
    },
    {
        numero: '02',
        modulo: 'M2',
        color: 'violet',
        icono: 'account_tree',
        titulo: 'Modelado de Procesos (SIPOC)',
        subtitulo: 'Análisis y Documentación de Procesos',
        descripcion:
            'Con los servicios identificados, se modela cada proceso usando la metodología SIPOC (Proveedores, Entradas, Proceso, Salidas, Clientes) para entender el flujo completo de información.',
        actividades: [
            'Construir el diagrama SIPOC de cada proceso',
            'Documentar los sistemas informáticos involucrados',
            'Definir los estándares de datos para el intercambio',
            'Establecer acuerdos de nivel de servicio (SLA) entre entidades',
        ],
        criterio: 'El proceso está bien modelado cuando cualquier técnico puede ejecutarlo sin depender de una sola persona.',
        enlace: null,
        enSIIP: 'El dashboard de SIIP compara el avance real de M2 mes a mes frente a lo esperado, con semáforo CEPLAN.',
    },
    {
        numero: '03',
        modulo: 'M3',
        color: 'emerald',
        icono: 'monitoring',
        titulo: 'Implementación y Seguimiento',
        subtitulo: 'Ejecución con Indicadores de Desempeño',
        descripcion:
            'Se implementan los servicios interoperables y se mide su desempeño mes a mes mediante indicadores clave (KPIs) para garantizar que el intercambio de datos funcione correctamente en producción.',
        actividades: [
            'Desplegar las integraciones de datos entre sistemas',
            'Registrar numerador y denominador de cada indicador mensualmente',
            'Monitorear el tiempo de respuesta y disponibilidad del servicio',
            'Reportar a CEPLAN según el calendario de seguimiento',
        ],
        criterio: 'Un proceso en seguimiento saludable tiene Avance T1 ≥ 95 % (semáforo Verde) en todos sus meses reportados.',
        enlace: '/proceso/M3.1',
        enSIIP: 'SIIP detecta automáticamente qué procesos de M3 están en rojo y genera alertas críticas en el navbar.',
    },
    {
        numero: '04',
        modulo: 'M4',
        color: 'amber',
        icono: 'auto_graph',
        titulo: 'Evaluación y Mejora Continua',
        subtitulo: 'Análisis de Resultados y Corrección',
        descripcion:
            'Con datos de varios meses, se evalúa si la interoperabilidad está generando valor real: ¿se redujeron los tiempos de atención? ¿los ciudadanos presentan menos documentos? Se ajustan procesos y metas para el siguiente ciclo.',
        actividades: [
            'Analizar tendencias con la gráfica de predicción hasta diciembre',
            'Identificar los procesos más críticos con el análisis Pareto',
            'Comparar módulos para priorizar recursos de mejora',
            'Actualizar los objetivos estratégicos para el próximo año',
        ],
        criterio: 'La mejora es continua cuando la predicción de fin de año muestra que todos los procesos alcanzarán su meta.',
        enlace: '/predicciones',
        enSIIP: 'El Asistente IA de SIIP analiza los datos y sugiere acciones de mejora alineadas a la Directiva N°0056-2024.',
    },
]

const COLORES = {
    blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',   num: 'bg-blue-600',   tag: 'bg-blue-100 text-blue-700',   icono: 'text-blue-600',   linea: 'bg-blue-200'   },
    violet:  { bg: 'bg-violet-50',  border: 'border-violet-200', num: 'bg-violet-600', tag: 'bg-violet-100 text-violet-700', icono: 'text-violet-600', linea: 'bg-violet-200' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200',num: 'bg-emerald-600',tag: 'bg-emerald-100 text-emerald-700',icono: 'text-emerald-600',linea: 'bg-emerald-200'},
    amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',  num: 'bg-amber-500',  tag: 'bg-amber-100 text-amber-700',  icono: 'text-amber-500',  linea: 'bg-amber-200'  },
}

const PRINCIPIOS = [
    { icono: 'swap_horiz',      titulo: 'Intercambio de datos',     desc: 'Las entidades del Estado comparten información de forma automática, sin que el ciudadano tenga que presentar documentos que ya existen en otro sistema.' },
    { icono: 'verified_user',   titulo: 'Estándar único',           desc: 'Todos los servicios siguen los lineamientos de la Directiva CEPLAN N°0056-2024, garantizando compatibilidad entre instituciones.' },
    { icono: 'people',          titulo: 'Centrado en el ciudadano', desc: 'El objetivo final es reducir la carga burocrática: menos trámites, menos tiempo de espera, menos documentos físicos.' },
    { icono: 'loop',            titulo: 'Mejora continua',          desc: 'Los indicadores se miden mensualmente y se ajustan procesos cuando el avance T1 cae por debajo del umbral verde (95 %).' },
]

function TarjetaPrincipio({ icono, titulo, desc }) {
    return (
        <div className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#1e3654] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#f4d100] text-xl">{icono}</span>
            </div>
            <div>
                <p className="font-semibold text-gray-900 text-sm">{titulo}</p>
                <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
            </div>
        </div>
    )
}

function TarjetaFase({ fase, index }) {
    const c = COLORES[fase.color]
    const esImpar = index % 2 === 0

    return (
        <div className={`flex flex-col lg:flex-row gap-0 ${esImpar ? '' : 'lg:flex-row-reverse'}`}>
            {/* Contenido */}
            <div className="lg:w-[calc(50%-2rem)] flex-shrink-0">
                <div className={`rounded-2xl border-2 ${c.border} ${c.bg} p-5 h-full`}>
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-xl ${c.num} flex items-center justify-center flex-shrink-0`}>
                            <span className="material-symbols-outlined text-white text-xl">{fase.icono}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.tag}`}>{fase.modulo}</span>
                                <span className="text-xs text-gray-400">Fase {fase.numero}</span>
                            </div>
                            <h3 className="font-bold text-gray-900 mt-1 text-base leading-tight">{fase.titulo}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{fase.subtitulo}</p>
                        </div>
                    </div>

                    <p className="text-sm text-gray-700 leading-relaxed mb-4">{fase.descripcion}</p>

                    {/* Actividades */}
                    <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Actividades clave</p>
                        <ul className="space-y-1.5">
                            {fase.actividades.map((a, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                    <span className={`material-symbols-outlined text-sm mt-0.5 flex-shrink-0 ${c.icono}`}>check_circle</span>
                                    {a}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Criterio de éxito */}
                    <div className="bg-white/70 rounded-xl p-3 mb-3 border border-white">
                        <p className="text-xs font-semibold text-gray-500 mb-1">Criterio de éxito</p>
                        <p className="text-xs text-gray-700 italic">"{fase.criterio}"</p>
                    </div>

                    {/* SIIP */}
                    <div className={`rounded-xl p-3 ${c.bg} border ${c.border}`}>
                        <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">smart_toy</span>
                            Cómo ayuda SIIP
                        </p>
                        <p className="text-xs text-gray-700">{fase.enSIIP}</p>
                        {fase.enlace && (
                            <Link
                                to={fase.enlace}
                                className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold ${c.icono} hover:underline`}
                            >
                                Ver en el dashboard
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Conector central — solo visible en desktop */}
            <div className="hidden lg:flex w-16 flex-shrink-0 flex-col items-center justify-center">
                <div className={`w-0.5 flex-1 ${c.linea}`} />
                <div className={`w-10 h-10 rounded-full ${c.num} flex items-center justify-center text-white font-black text-sm shadow-lg z-10`}>
                    {fase.numero}
                </div>
                <div className={`w-0.5 flex-1 ${c.linea}`} />
            </div>

            {/* Espacio espejo en desktop */}
            <div className="hidden lg:block lg:w-[calc(50%-2rem)] flex-shrink-0" />
        </div>
    )
}

export default function HojaDeRutaPage() {
    return (
        <div className="max-w-5xl mx-auto space-y-10">

            {/* Hero */}
            <div className="bg-[#1e3654] rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-4 right-8 text-[12rem] leading-none font-black text-white select-none">SIIP</div>
                </div>
                <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-[#f4d100] text-2xl">route</span>
                        <span className="text-[#f4d100] text-sm font-semibold uppercase tracking-widest">Hoja de Ruta</span>
                    </div>
                    <h1 className="text-3xl font-black mb-3 leading-tight">
                        ¿Cómo implementar la<br />
                        <span className="text-[#f4d100]">Interoperabilidad</span> en tu institución?
                    </h1>
                    <p className="text-white/80 text-base max-w-2xl leading-relaxed">
                        La <strong className="text-white">Directiva CEPLAN N°0056-2024</strong> establece que las instituciones públicas deben hacer que sus servicios sean interoperables — es decir, capaces de compartir datos automáticamente con otras entidades del Estado para servir mejor al ciudadano.
                    </p>
                    <p className="text-white/70 text-sm mt-3">
                        Esta hoja de ruta te guía desde cero hasta tener procesos medibles, con semáforos y predicciones de cumplimiento.
                    </p>
                </div>
            </div>

            {/* ¿Qué es interoperabilidad? */}
            <div>
                <div className="flex items-center gap-2 mb-5">
                    <span className="material-symbols-outlined text-[#1e3654] text-xl">help</span>
                    <h2 className="text-xl font-bold text-gray-900">¿Qué es la interoperabilidad?</h2>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
                    <p className="text-gray-700 leading-relaxed text-sm mb-4">
                        La interoperabilidad es la <strong>capacidad de dos o más sistemas de información de intercambiar datos y usarlos automáticamente</strong>, sin intervención manual. En el sector público peruano significa que cuando un ciudadano solicita un servicio en una entidad, esa entidad puede obtener directamente los datos que necesita de otras entidades (RENIEC, SUNAT, ESSALUD, etc.) sin pedirle al ciudadano que los lleve en papel.
                    </p>
                    <div className="flex items-center gap-3 bg-[#f4d100]/10 border border-[#f4d100]/40 rounded-xl p-4">
                        <span className="material-symbols-outlined text-[#1e3654] text-2xl flex-shrink-0">lightbulb</span>
                        <p className="text-sm text-gray-800">
                            <strong>Ejemplo real:</strong> Un ciudadano solicita una pensión de invalidez. Con interoperabilidad, la entidad consulta automáticamente su CUI a RENIEC, su historial laboral a SUNAT y su diagnóstico médico a ESSALUD — todo en segundos, sin que el ciudadano presente ningún documento.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PRINCIPIOS.map((p, i) => <TarjetaPrincipio key={i} {...p} />)}
                </div>
            </div>

            {/* Semáforo explicación rápida */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-[#1e3654] text-xl">traffic</span>
                    <h2 className="text-lg font-bold text-gray-900">El semáforo CEPLAN: cómo leer el avance</h2>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                    Cada proceso tiene un <strong>Avance T1</strong> — qué porcentaje de lo esperado se ha logrado a la fecha. SIIP lo convierte en un semáforo de 3 colores:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                        <span className="text-3xl">🟢</span>
                        <div>
                            <p className="font-bold text-green-800 text-sm">Verde — En camino</p>
                            <p className="text-green-700 text-xs">Avance T1 ≥ 95 %</p>
                            <p className="text-green-600 text-xs mt-1">Continuar con el plan actual.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <span className="text-3xl">🟡</span>
                        <div>
                            <p className="font-bold text-yellow-800 text-sm">Amarillo — En observación</p>
                            <p className="text-yellow-700 text-xs">Avance T1 entre 75 % y 95 %</p>
                            <p className="text-yellow-600 text-xs mt-1">Revisar causas y reforzar.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                        <span className="text-3xl">🔴</span>
                        <div>
                            <p className="font-bold text-red-800 text-sm">Rojo — Intervención urgente</p>
                            <p className="text-red-700 text-xs">Avance T1 &lt; 75 %</p>
                            <p className="text-red-600 text-xs mt-1">Escalar al responsable inmediatamente.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hoja de Ruta — Las 4 fases */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[#1e3654] text-xl">map</span>
                    <h2 className="text-xl font-bold text-gray-900">Las 4 fases de implementación</h2>
                </div>
                <p className="text-sm text-gray-500 mb-8">
                    Cada fase corresponde a un módulo del sistema. Sigue el orden: no puedes evaluar (M4) lo que no has implementado (M3), ni implementar lo que no has modelado (M2), ni modelar lo que no has identificado (M1).
                </p>

                {/* Timeline */}
                <div className="relative flex flex-col gap-6">
                    {/* Línea vertical central en desktop */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 hidden lg:block -translate-x-1/2 z-0" />

                    {FASES.map((fase, i) => (
                        <TarjetaFase key={fase.modulo} fase={fase} index={i} />
                    ))}
                </div>
            </div>

            {/* Cómo usar SIIP para cada paso */}
            <div className="bg-gradient-to-br from-[#1e3654] to-[#2d4f7a] rounded-2xl p-8 text-white">
                <div className="flex items-center gap-3 mb-6">
                    <span className="text-3xl">🤖</span>
                    <div>
                        <h2 className="text-xl font-bold">El Asistente IA de SIIP</h2>
                        <p className="text-white/70 text-sm">Tu guía inteligente en cada fase</p>
                    </div>
                </div>
                <p className="text-white/85 text-sm leading-relaxed mb-6">
                    En cualquier momento puedes abrir el <strong className="text-[#f4d100]">Asistente IA</strong> (botón azul en la esquina inferior derecha) y hacerle preguntas como:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {[
                        '¿Cómo completo el módulo M2 de la guía CEPLAN?',
                        '¿Qué proceso necesita atención urgente ahora mismo?',
                        '¿Qué significa que M3.1 esté en amarillo?',
                        '¿Qué acciones tomar para mejorar el avance de M4?',
                    ].map((q, i) => (
                        <div key={i} className="flex items-start gap-2 bg-white/10 rounded-xl p-3">
                            <span className="material-symbols-outlined text-[#f4d100] text-sm flex-shrink-0 mt-0.5">chat</span>
                            <p className="text-sm text-white/90 italic">"{q}"</p>
                        </div>
                    ))}
                </div>
                <p className="text-white/60 text-xs">
                    El asistente analiza los datos reales cargados en SIIP y responde con recomendaciones específicas para tu institución, alineadas a la Directiva N°0056-2024.
                </p>
            </div>

            {/* Accesos rápidos al dashboard */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Explorar el dashboard</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                        { to: '/',            icono: 'dashboard',      label: 'Dashboard',     desc: 'Vista general con semáforos',      color: 'blue'    },
                        { to: '/comparativa', icono: 'compare_arrows', label: 'Comparativa',   desc: 'Evolución mensual por módulo',     color: 'violet'  },
                        { to: '/pareto',      icono: 'bar_chart',      label: 'Pareto',        desc: 'Procesos que concentran el 80 %',  color: 'red'     },
                        { to: '/predicciones',icono: 'insights',       label: 'Predicciones',  desc: 'Proyección hasta diciembre',       color: 'emerald' },
                        { to: '/objetivos',   icono: 'flag',           label: 'Objetivos',     desc: 'Mapa estratégico por proceso',     color: 'amber'   },
                        { to: '/metodologia', icono: 'menu_book',      label: 'Metodología',   desc: 'Referencia de la Directiva',       color: 'gray'    },
                    ].map(({ to, icono, label, desc }) => (
                        <Link
                            key={to}
                            to={to}
                            className="flex items-start gap-3 bg-white border border-gray-100 shadow-sm rounded-xl p-4 hover:shadow-md hover:border-[#1e3654]/20 transition-all group"
                        >
                            <span className="material-symbols-outlined text-[#1e3654] group-hover:text-[#f4d100] transition-colors text-xl flex-shrink-0">{icono}</span>
                            <div>
                                <p className="font-semibold text-gray-900 text-sm">{label}</p>
                                <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

        </div>
    )
}

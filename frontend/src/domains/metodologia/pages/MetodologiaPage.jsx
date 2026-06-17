import { useState, useEffect } from 'react'

import { useDatos } from '../../../shared/hooks/useDatos'
import SemaforoBadge from '../../../shared/components/SemaforoBadge'
import RelevanciaBadge from '../../../shared/components/RelevanciaBadge'
import FormulaBox from '../components/FormulaBox'
import { getMetodologia } from '../api/metodologiaApi'

// ---- helpers visuales -----------------------------------------------

function Seccion({ titulo, icono, children, defaultOpen = false }) {
    const [abierto, setAbierto] = useState(defaultOpen)
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button
                onClick={() => setAbierto((p) => !p)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#f2f4f7]/60 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#1e3654] text-xl">{icono}</span>
                    <span className="font-semibold text-[#1e3654] text-base">{titulo}</span>
                </div>
                <span className="material-symbols-outlined text-gray-400 text-xl">
                    {abierto ? 'expand_less' : 'expand_more'}
                </span>
            </button>
            {abierto && <div className="px-5 pb-5 border-t border-gray-100 pt-4">{children}</div>}
        </div>
    )
}

function Chip({ label, color = 'gray' }) {
    const estilos = {
        verde:    'bg-[#d1fadf] text-[#1f7a47]',
        amarillo: 'bg-[#fef9c3] text-[#854d0e]',
        rojo:     'bg-[#ffe8e8] text-[#9c1d1d]',
        gray:     'bg-gray-100 text-gray-600',
        blue:     'bg-[#dbeafe] text-[#1e40af]',
    }
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${estilos[color] ?? estilos.gray}`}>
            {label}
        </span>
    )
}

function Paso({ numero, texto }) {
    return (
        <div className="flex gap-3 items-start">
            <span className="shrink-0 w-6 h-6 rounded-full bg-[#1e3654] text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {numero}
            </span>
            <p className="text-sm text-gray-700 leading-relaxed">{texto}</p>
        </div>
    )
}

// ---- secciones de contenido -----------------------------------------

function SeccionSemaforo({ data }) {
    const { umbrales, conteos, total } = data
    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-600">
                El semáforo CEPLAN clasifica el avance tipo I de cada indicador en tres niveles
                según la Directiva N°&nbsp;0056-2024-CEPLAN/PCD.
            </p>
            <FormulaBox label="Definición">
                Verde   → Av(T1) ≥ {umbrales.verde}{'  '}→ cumplimiento logrado{'\n'}
                Amarillo → Av(T1) ≥ {umbrales.amarillo} y &lt; {umbrales.verde}{'  '}→ desvío moderado{'\n'}
                Rojo    → Av(T1) &lt; {umbrales.amarillo}{'  '}→ desvío alto
            </FormulaBox>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                {[
                    { label: 'Verde', count: conteos.Verde, color: 'verde' },
                    { label: 'Amarillo', count: conteos.Amarillo, color: 'amarillo' },
                    { label: 'Rojo', count: conteos.Rojo, color: 'rojo' },
                    { label: 'Sin datos', count: conteos['Sin datos'] ?? 0, color: 'gray' },
                ].map(({ label, count, color }) => (
                    <div key={label} className={`rounded-lg p-3 text-center ${
                        color === 'verde'    ? 'bg-[#d1fadf]' :
                        color === 'amarillo' ? 'bg-[#fef9c3]' :
                        color === 'rojo'     ? 'bg-[#ffe8e8]' : 'bg-gray-100'
                    }`}>
                        <p className="text-2xl font-bold text-[#1e3654]">{count}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{label} de {total}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

function SeccionAvanceT1({ procesos }) {
    const [codigoSel, setCodigoSel] = useState(procesos[0]?.codigo ?? '')
    const proceso = procesos.find((p) => p.codigo === codigoSel)

    if (!proceso) return null

    const es_desc = proceso.es_descendente

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-600">
                El Avance Tipo I mide el nivel de cumplimiento comparando el valor obtenido con
                el logro esperado para el mismo período.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <FormulaBox label="Indicador ascendente (mayor es mejor)">
                        {'Av(T1) = min(100,  VO_t / LE_t × 100)'}
                    </FormulaBox>
                    <FormulaBox label="Indicador descendente (menor es mejor)">
                        {'Av(T1) = min(100,  LE_t / VO_t × 100)'}
                    </FormulaBox>
                    <p className="text-xs text-gray-500 mt-1">
                        VO_t = valor obtenido · LE_t = logro esperado
                    </p>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">
                            Proceso a explorar
                        </label>
                        <select
                            value={codigoSel}
                            onChange={(e) => setCodigoSel(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#1e3654] w-full focus:outline-none focus:ring-2 focus:ring-[#1e3654]/30"
                        >
                            {procesos.map((p) => (
                                <option key={p.codigo} value={p.codigo}>{p.codigo} — {p.proceso}</option>
                            ))}
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-[#f2f4f7] text-gray-500 uppercase">
                                <tr>
                                    {['Mes', 'Obtenido', 'Esperado', 'Cálculo', 'Avance T1', ''].map((h) => (
                                        <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {proceso.todos_los_meses.map((m) => {
                                    const vo = m.resultado_obtenido
                                    const le = m.resultado_esperado
                                    const calculo = es_desc
                                        ? `min(100, ${le}/${vo}×100)`
                                        : `min(100, ${vo}/${le}×100)`
                                    return (
                                        <tr key={m.mes} className="hover:bg-[#f2f4f7]">
                                            <td className="px-3 py-2 font-medium text-[#1e3654]">{m.mes}</td>
                                            <td className="px-3 py-2">{vo}</td>
                                            <td className="px-3 py-2">{le}</td>
                                            <td className="px-3 py-2 font-mono text-gray-500">{calculo}</td>
                                            <td className="px-3 py-2 font-semibold">{m.avance_t1?.toFixed(1)}%</td>
                                            <td className="px-3 py-2"><SemaforoBadge semaforo={m.semaforo} /></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

function SeccionRelevancia({ modulos }) {
    const [moduloSel, setModuloSel] = useState(modulos[0]?.modulo ?? '')
    const modulo = modulos.find((m) => m.modulo === moduloSel)

    if (!modulo) return null

    const { indicadores, r_min, total_pesos } = modulo

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-600">
                La relevancia (Tabla A4) clasifica cada indicador dentro de su elemento según
                su importancia para medir la dimensión principal. El ponderador (Tabla A5)
                determina cuánto peso tiene cada indicador en el avance del módulo.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fórmula y pasos */}
                <div className="space-y-3">
                    <FormulaBox label="Fórmula del ponderador (Tabla A5)">
                        {'w_k = (R_min − (R_k − 1)) / Σᵢ(R_min − (R_i − 1))'}
                    </FormulaBox>
                    <div className="space-y-2 text-sm">
                        <p className="font-medium text-[#1e3654]">Grados de relevancia (Tabla A4):</p>
                        {[
                            { r: 1, label: 'R=1 · Muy relevante', desc: 'El mejor indicador para la dimensión principal' },
                            { r: 2, label: 'R=2 · Relevante', desc: 'El segundo mejor indicador disponible' },
                            { r: 3, label: 'R=3 · Menos relevante', desc: 'El tercer mejor indicador disponible' },
                        ].map(({ r, label, desc }) => (
                            <div key={r} className="flex gap-2 items-start">
                                <RelevanciaBadge relevancia={r} compacto />
                                <div>
                                    <span className="font-medium">{label}</span>
                                    <span className="text-gray-500"> — {desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ejemplo interactivo */}
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">
                            Módulo a explorar
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {modulos.map((m) => (
                                <button
                                    key={m.modulo}
                                    onClick={() => setModuloSel(m.modulo)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                        m.modulo === moduloSel
                                            ? 'bg-[#1e3654] text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {m.modulo}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Paso a paso */}
                    <div className="bg-[#f8fafc] rounded-lg p-4 space-y-2 text-sm">
                        <p className="font-semibold text-[#1e3654] mb-3">Cálculo para {modulo.modulo}:</p>
                        <Paso numero="1" texto={`R_min = máximo R entre los indicadores = max(${indicadores.map(i => i.relevancia).join(', ')}) = ${r_min}`} />
                        <Paso numero="2" texto={`Pesos brutos: ${indicadores.map(i => `${i.codigo} → (${r_min}−(${i.relevancia}−1)) = ${i.peso_bruto}`).join(' | ')}`} />
                        <Paso numero="3" texto={`Suma de pesos: ${indicadores.map(i => i.peso_bruto).join(' + ')} = ${total_pesos}`} />
                        <Paso numero="4" texto={`Ponderadores: ${indicadores.map(i => `${i.codigo} = ${i.peso_bruto}/${total_pesos} = ${(i.ponderador * 100).toFixed(1)}%`).join(' | ')}`} />
                    </div>

                    <table className="w-full text-sm">
                        <thead className="bg-[#f2f4f7] text-gray-500 text-xs uppercase">
                            <tr>
                                {['Proceso', 'Relevancia', 'Fórmula', 'Ponderador'].map((h) => (
                                    <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {indicadores.map((ind) => (
                                <tr key={ind.codigo} className="hover:bg-[#f2f4f7]">
                                    <td className="px-3 py-2 font-mono font-semibold text-[#1e3654]">{ind.codigo}</td>
                                    <td className="px-3 py-2">
                                        <RelevanciaBadge relevancia={ind.relevancia} compacto />
                                        <span className="ml-1.5 text-xs text-gray-500">{ind.descripcion_relevancia}</span>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-gray-500 text-xs">{ind.formula}</td>
                                    <td className="px-3 py-2 font-semibold text-[#1e3654]">{ind.ponderador_porcentaje}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function SeccionMejora({ mejoras }) {
    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-600">
                La mejora compara el resultado obtenido entre el primer y el último mes
                reportado para cada proceso, mostrando su evolución en el período.
            </p>
            <FormulaBox label="Fórmula">
                {'Mejora = Resultado_obtenido(último_mes) − Resultado_obtenido(primer_mes)'}
            </FormulaBox>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-[#f2f4f7] text-gray-500 text-xs uppercase">
                        <tr>
                            {['Proceso', 'Primer mes', 'Valor inicial', 'Último mes', 'Valor final', 'Cálculo', 'Mejora'].map((h) => (
                                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {mejoras.map((m) => (
                            <tr key={m.codigo} className="hover:bg-[#f2f4f7]">
                                <td className="px-4 py-3 font-mono font-semibold text-[#1e3654]">{m.codigo}</td>
                                <td className="px-4 py-3 text-gray-600">{m.primer_mes}</td>
                                <td className="px-4 py-3 text-gray-600">{m.primer_valor} {m.unidad}</td>
                                <td className="px-4 py-3 text-gray-600">{m.ultimo_mes}</td>
                                <td className="px-4 py-3 text-gray-600">{m.ultimo_valor} {m.unidad}</td>
                                <td className="px-4 py-3 font-mono text-gray-500 text-xs">{m.formula}</td>
                                <td className="px-4 py-3">
                                    <span className={`font-semibold flex items-center gap-1 ${m.es_mejora ? 'text-[#1f7a47]' : 'text-[#9c1d1d]'}`}>
                                        <span className="material-symbols-outlined text-sm">
                                            {m.es_mejora ? 'trending_up' : 'trending_down'}
                                        </span>
                                        {m.mejora_absoluta > 0 ? '+' : ''}{m.mejora_absoluta} {m.unidad}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function SeccionPrediccion({ predicciones }) {
    const [codigoSel, setCodigoSel] = useState(predicciones[0]?.codigo ?? '')
    const pred = predicciones.find((p) => p.codigo === codigoSel)

    if (!pred) return null

    const colorTendencia = pred.tendencia === 'ascendente'
        ? 'text-[#1f7a47]'
        : pred.tendencia === 'descendente'
            ? 'text-[#9c1d1d]'
            : 'text-[#854d0e]'

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-600">
                La predicción usa mínimos cuadrados (regresión lineal) sobre los meses
                reportados para proyectar el valor a diciembre. El coeficiente R² indica
                qué tan bien la recta explica la variación real.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <FormulaBox label="Regresión lineal (mínimos cuadrados)">
                        {'y = b₀ + b₁·x\n\nb₁ = Σ(x−x̄)(y−ȳ) / Σ(x−x̄)²\nb₀ = ȳ − b₁·x̄\n\nR² = [Σ(x−x̄)(y−ȳ)]² / [Σ(x−x̄)²·Σ(y−ȳ)²]'}
                    </FormulaBox>
                    <p className="text-xs text-gray-500">
                        x = número de mes (1=Enero … 12=Diciembre)<br />
                        y = resultado obtenido del indicador
                    </p>
                    <div className="bg-[#f2f4f7] rounded-lg p-3 text-xs space-y-1">
                        <p className="font-medium text-[#1e3654]">Interpretación R²:</p>
                        <p><Chip label="R² ≥ 0.80" color="verde" /> Alta confiabilidad — la recta explica bien la tendencia</p>
                        <p><Chip label="R² ≥ 0.50" color="amarillo" /> Confiabilidad media</p>
                        <p><Chip label="R² &lt; 0.50" color="rojo" /> Baja confiabilidad — datos muy dispersos</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">
                            Proceso a explorar
                        </label>
                        <select
                            value={codigoSel}
                            onChange={(e) => setCodigoSel(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#1e3654] w-full focus:outline-none focus:ring-2 focus:ring-[#1e3654]/30"
                        >
                            {predicciones.map((p) => (
                                <option key={p.codigo} value={p.codigo}>{p.codigo} — {p.proceso}</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-[#f8fafc] rounded-lg p-4 space-y-2 text-sm">
                        <p className="font-semibold text-[#1e3654] mb-2">Resultado para {pred.codigo}:</p>
                        <div className="grid grid-cols-2 gap-2">
                            <Dato label="Meses usados" valor={pred.meses_con_datos} />
                            <Dato label="Pendiente (b₁)" valor={`${pred.pendiente > 0 ? '+' : ''}${pred.pendiente} ${pred.unidad}/mes`} />
                            <Dato label="R² (confiabilidad)" valor={pred.r_cuadrado} />
                            <Dato label="Tendencia" valor={
                                <span className={`capitalize font-semibold ${colorTendencia}`}>{pred.tendencia}</span>
                            } />
                            <Dato label="Proy. diciembre" valor={`${pred.valor_diciembre} ${pred.unidad}`} />
                            <Dato label="Meta anual" valor={`${pred.meta_final} ${pred.unidad}`} />
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                            <FormulaBox label="Ecuación ajustada">
                                {pred.formula_regresion}
                            </FormulaBox>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                            <span className="material-symbols-outlined text-base">
                                {pred.alcanzara_meta ? 'check_circle' : 'cancel'}
                            </span>
                            <span className={`text-sm font-medium ${pred.alcanzara_meta ? 'text-[#1f7a47]' : 'text-[#9c1d1d]'}`}>
                                {pred.alcanzara_meta
                                    ? `Alcanza la meta en ${pred.mes_alcanza_meta ?? 'diciembre'}`
                                    : 'No alcanza la meta antes de diciembre'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function Dato({ label, valor }) {
    return (
        <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="font-semibold text-[#1e3654]">{valor}</p>
        </div>
    )
}

// ---- página principal -----------------------------------------------

export default function MetodologiaPage() {
    const { version } = useDatos()
    const [datos, setDatos] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let isMounted = true
        async function cargar() {
            try {
                const res = await getMetodologia()
                if (isMounted) { setDatos(res.data); setError(null) }
            } catch (err) {
                if (isMounted) setError('No se pudo cargar la metodología. Verifica que el servidor esté activo.')
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }
        cargar()
        return () => { isMounted = false }
    }, [version])

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Cargando metodología…
        </div>
    )

    if (error) return (
        <div className="flex items-center gap-2 p-6 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl">
            <span className="material-symbols-outlined">error</span>
            {error}
        </div>
    )

    const { semaforo, modulos, avance_t1, mejora, prediccion } = datos

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#1e3654]">Metodología de cálculo</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Explica cómo se obtiene cada resultado usando las fórmulas de la
                    Directiva CEPLAN N°&nbsp;0056-2024, aplicadas a los datos reales cargados.
                </p>
            </div>

            <div className="space-y-3">
                <Seccion titulo="Semáforo CEPLAN — umbrales de cumplimiento" icono="traffic" defaultOpen>
                    <SeccionSemaforo data={semaforo} />
                </Seccion>

                <Seccion titulo="Avance Tipo I — cómo se calcula para cada mes" icono="calculate">
                    <SeccionAvanceT1 procesos={avance_t1} />
                </Seccion>

                <Seccion titulo="Relevancia y Ponderación — peso de cada indicador (Tablas A4 y A5)" icono="weight">
                    <SeccionRelevancia modulos={modulos} />
                </Seccion>

                <Seccion titulo="Mejora del proceso — evolución entre primer y último mes" icono="trending_up">
                    <SeccionMejora mejoras={mejora} />
                </Seccion>

                <Seccion titulo="Predicción — regresión lineal por mínimos cuadrados" icono="show_chart">
                    <SeccionPrediccion predicciones={prediccion} />
                </Seccion>
            </div>
        </div>
    )
}

import { useState, useEffect } from 'react'

import { obtenerEstadoIA, pedirCausas, getErrorIA } from '../../../shared/services/analisisService'

function CausaSugerida({ causa, marcada, onToggle }) {
    return (
        <li>
            <label className="flex items-start gap-2 p-2 rounded-lg hover:bg-white cursor-pointer">
                <input
                    type="checkbox"
                    checked={marcada}
                    onChange={onToggle}
                    className="mt-0.5 accent-[#1e3654]"
                />
                <div className="min-w-0">
                    <p className="text-sm text-gray-700">
                        {causa.descripcion}
                        {causa.es_raiz && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#fef9c3] text-[#854d0e] text-[10px] font-bold">
                                CAUSA RAÍZ
                            </span>
                        )}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                        {causa.categoria} · peso {causa.peso}
                        {causa.justificacion && ` — ${causa.justificacion}`}
                    </p>
                </div>
            </label>
        </li>
    )
}

/**
 * Propone causas Ishikawa a partir del desempeño real del proceso.
 *
 * Nada se guarda automáticamente: la IA puede equivocarse y el diagnóstico es
 * responsabilidad del analista, así que se marcan las que se aceptan y solo
 * esas se persisten.
 */
export default function SugerenciasCausasIA({ codigo, onAceptar }) {
    const [disponible, setDisponible] = useState(false)
    const [abierto, setAbierto] = useState(false)
    const [sugerencias, setSugerencias] = useState(null)
    const [marcadas, setMarcadas] = useState(new Set())
    const [cargando, setCargando] = useState(false)
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        let activo = true
        obtenerEstadoIA().then((estado) => { if (activo) setDisponible(estado.disponible) })
        return () => { activo = false }
    }, [])

    async function generar() {
        setCargando(true)
        setError(null)
        try {
            const data = await pedirCausas(codigo)
            setSugerencias(data)
            // Se preseleccionan las causas raíz: son las que aportan más valor
            setMarcadas(new Set((data.causas ?? []).map((_, i) => i).filter((i) => data.causas[i].es_raiz)))
            setAbierto(true)
        } catch (err) {
            setError(getErrorIA(err))
        } finally {
            setCargando(false)
        }
    }

    function alternar(indice) {
        setMarcadas((prev) => {
            const siguiente = new Set(prev)
            if (siguiente.has(indice)) siguiente.delete(indice)
            else siguiente.add(indice)
            return siguiente
        })
    }

    async function aceptar() {
        const elegidas = (sugerencias.causas ?? []).filter((_, i) => marcadas.has(i))
        if (elegidas.length === 0) return
        setGuardando(true)
        try {
            await onAceptar(elegidas)
            setSugerencias(null)
            setMarcadas(new Set())
            setAbierto(false)
        } catch (err) {
            setError(getErrorIA(err))
        } finally {
            setGuardando(false)
        }
    }

    if (!disponible) return null

    return (
        <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-[#f2f4f7] to-white p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[#1e3654] bg-[#f4d100] rounded-lg p-1 text-lg">
                        auto_awesome
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-[#1e3654]">¿No sabes por dónde empezar?</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            La IA analiza el desempeño de {codigo} y propone causas probables. Tú decides cuáles guardar.
                        </p>
                    </div>
                </div>
                <button
                    onClick={generar}
                    disabled={cargando}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56] disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined text-base ${cargando ? 'animate-spin' : ''}`}>
                        {cargando ? 'progress_activity' : 'auto_awesome'}
                    </span>
                    {cargando ? 'Analizando…' : 'Proponer causas'}
                </button>
            </div>

            {error && (
                <p className="flex items-center gap-2 text-sm text-[#9c1d1d] bg-[#ffe8e8] rounded-lg px-3 py-2 mt-3">
                    <span className="material-symbols-outlined text-base">error</span>{error}
                </p>
            )}

            {abierto && sugerencias?.causas?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                    <ul className="space-y-0.5">
                        {sugerencias.causas.map((causa, i) => (
                            <CausaSugerida
                                key={i}
                                causa={causa}
                                marcada={marcadas.has(i)}
                                onToggle={() => alternar(i)}
                            />
                        ))}
                    </ul>

                    {sugerencias.oportunidades?.length > 0 && (
                        <div className="rounded-lg bg-white border border-gray-100 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                                Oportunidades que propone (regístralas en la pestaña siguiente)
                            </p>
                            <ul className="space-y-1">
                                {sugerencias.oportunidades.map((o, i) => (
                                    <li key={i} className="text-xs text-gray-600">
                                        <span className="material-symbols-outlined text-sm text-[#f4d100] align-middle mr-1">
                                            lightbulb
                                        </span>
                                        <strong className="text-gray-700">{o.descripcion}</strong>
                                        {o.accion_propuesta && ` — ${o.accion_propuesta}`}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={aceptar}
                            disabled={guardando || marcadas.size === 0}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1f7a47] text-white hover:brightness-95 disabled:opacity-50"
                        >
                            <span className={`material-symbols-outlined text-base ${guardando ? 'animate-spin' : ''}`}>
                                {guardando ? 'progress_activity' : 'check'}
                            </span>
                            Guardar {marcadas.size} causa(s)
                        </button>
                        <button
                            onClick={() => { setAbierto(false); setSugerencias(null) }}
                            className="px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100"
                        >
                            Descartar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

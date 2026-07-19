import { useState, useEffect } from 'react'

import {
    obtenerEstadoIA,
    pedirMejoraCompleta,
    aplicarMejoraCompleta,
    getErrorIA,
} from '../../../shared/services/analisisService'

const ETAPA_TEXTO = {
    descongelar: 'Descongelar',
    cambiar: 'Cambiar',
    recongelar: 'Recongelar',
}

/** Bloque revisable: se puede excluir entero antes de aplicar. */
function Bloque({ titulo, icono, cantidad, incluido, onToggle, children }) {
    return (
        <section className={`rounded-lg border p-3 transition-colors ${
            incluido ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
        }`}>
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={incluido} onChange={onToggle} className="accent-[#1e3654]" />
                <span className="material-symbols-outlined text-base text-gray-400">{icono}</span>
                <span className="text-sm font-semibold text-[#1e3654]">{titulo}</span>
                <span className="text-[11px] text-gray-400">({cantidad})</span>
            </label>
            <div className="mt-2 pl-6">{children}</div>
        </section>
    )
}

/**
 * Genera y aplica el ciclo de mejora completo: Ishikawa, oportunidades,
 * Antes/Después y Lewin. La IA propone las tres primeras partes; la proyección
 * la calcula el propio sistema (rampa hasta la meta), no el modelo.
 *
 * Nada se guarda hasta que el usuario revisa y pulsa "Aplicar": el contenido
 * de la mejora es responsabilidad de la entidad, no del modelo.
 */
export default function CompletarMejoraIA({ codigo, onAplicado }) {
    const [disponible, setDisponible] = useState(false)
    const [propuesta, setPropuesta] = useState(null)
    const [incluir, setIncluir] = useState({ causas: true, oportunidades: true, cambio: true, proyeccion: true })
    const [cargando, setCargando] = useState(false)
    const [aplicando, setAplicando] = useState(false)
    const [error, setError] = useState(null)
    const [resultado, setResultado] = useState(null)

    useEffect(() => {
        let activo = true
        obtenerEstadoIA().then((estado) => { if (activo) setDisponible(estado.disponible) })
        return () => { activo = false }
    }, [])

    async function generar() {
        setCargando(true)
        setError(null)
        setResultado(null)
        try {
            const data = await pedirMejoraCompleta(codigo)
            setPropuesta(data)
            setIncluir({ causas: true, oportunidades: true, cambio: true, proyeccion: true })
        } catch (err) {
            setError(getErrorIA(err))
        } finally {
            setCargando(false)
        }
    }

    async function aplicar() {
        setAplicando(true)
        setError(null)
        try {
            const data = await aplicarMejoraCompleta(codigo, {
                causas: incluir.causas ? propuesta.causas ?? [] : [],
                oportunidades: incluir.oportunidades ? propuesta.oportunidades ?? [] : [],
                cambio: incluir.cambio ? propuesta.cambio ?? [] : [],
                proyeccion: incluir.proyeccion ? propuesta.proyeccion ?? null : null,
            })
            setResultado(data.aplicado)
            setPropuesta(null)
            onAplicado?.()
        } catch (err) {
            setError(getErrorIA(err))
        } finally {
            setAplicando(false)
        }
    }

    if (!disponible) return null

    const alternar = (clave) => setIncluir((p) => ({ ...p, [clave]: !p[clave] }))
    const proyeccion = propuesta?.proyeccion
    const nada = propuesta && !Object.values(incluir).some(Boolean)

    return (
        <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-[#f2f4f7] to-white p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[#1e3654] bg-[#f4d100] rounded-lg p-1 text-lg">
                        auto_awesome
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-[#1e3654]">Completar toda la mejora con IA</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Propone las 4 partes de {codigo}: causas (Ishikawa), oportunidades (F=C×I),
                            plan de cambio (Lewin) y la proyección Antes/Después. Tú revisas antes de guardar.
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
                    {cargando ? 'Diseñando la mejora…' : 'Completar mejora'}
                </button>
            </div>

            {error && (
                <p className="flex items-center gap-2 text-sm text-[#9c1d1d] bg-[#ffe8e8] rounded-lg px-3 py-2 mt-3">
                    <span className="material-symbols-outlined text-base">error</span>{error}
                </p>
            )}

            {resultado && (
                <p className="flex items-center gap-2 text-sm text-[#1f7a47] bg-[#dcf8e8] rounded-lg px-3 py-2 mt-3">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    Se guardaron {resultado.causas} causa(s), {resultado.oportunidades} oportunidad(es),
                    {' '}{resultado.cambio} acción(es) de cambio
                    {resultado.proyeccion ? ' y la proyección Antes/Después' : ''}.
                </p>
            )}

            {propuesta && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                    <Bloque
                        titulo="Causas (Ishikawa)" icono="lan"
                        cantidad={propuesta.causas?.length ?? 0}
                        incluido={incluir.causas} onToggle={() => alternar('causas')}
                    >
                        <ul className="space-y-1">
                            {(propuesta.causas ?? []).map((c, i) => (
                                <li key={i} className="text-xs text-gray-600">
                                    <span className="font-semibold text-[#1e3654]">{c.categoria}:</span> {c.descripcion}
                                    {c.es_raiz && (
                                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#fef9c3] text-[#854d0e] text-[10px] font-bold">
                                            RAÍZ
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </Bloque>

                    <Bloque
                        titulo="Oportunidades (F=C×I)" icono="lightbulb"
                        cantidad={propuesta.oportunidades?.length ?? 0}
                        incluido={incluir.oportunidades} onToggle={() => alternar('oportunidades')}
                    >
                        <ul className="space-y-1">
                            {(propuesta.oportunidades ?? []).map((o, i) => (
                                <li key={i} className="text-xs text-gray-600">
                                    <strong className="text-gray-700">{o.descripcion}</strong>
                                    <span className="text-gray-400"> · C{o.costo}×I{o.impacto}={o.costo * o.impacto} · {o.estrategia}</span>
                                </li>
                            ))}
                        </ul>
                    </Bloque>

                    <Bloque
                        titulo="Antes / Después" icono="compare_arrows"
                        cantidad={proyeccion?.meses?.length ?? 0}
                        incluido={incluir.proyeccion} onToggle={() => alternar('proyeccion')}
                    >
                        {proyeccion?.meses?.length > 0 ? (
                            <p className="text-xs text-gray-600">
                                Proyección de <strong>{proyeccion.indicador}</strong>: {proyeccion.meses.length} mes(es)
                                hasta {proyeccion.meses.at(-1)?.mes} ({proyeccion.meses.at(-1)?.valor}).
                                {proyeccion.nota && <span className="block text-gray-400 mt-0.5">{proyeccion.nota}</span>}
                            </p>
                        ) : (
                            <p className="text-xs text-gray-400">
                                No se pudo proyectar: el indicador necesita mediciones y meta final.
                            </p>
                        )}
                    </Bloque>

                    <Bloque
                        titulo="Gestión del cambio (Lewin)" icono="change_circle"
                        cantidad={propuesta.cambio?.length ?? 0}
                        incluido={incluir.cambio} onToggle={() => alternar('cambio')}
                    >
                        <ul className="space-y-1">
                            {(propuesta.cambio ?? []).map((a, i) => (
                                <li key={i} className="text-xs text-gray-600">
                                    <span className="font-semibold text-[#1e3654]">
                                        {ETAPA_TEXTO[a.etapa] ?? a.etapa}:
                                    </span> {a.descripcion}
                                    {a.responsable && <span className="text-gray-400"> · {a.responsable}</span>}
                                </li>
                            ))}
                        </ul>
                    </Bloque>

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                        <button
                            onClick={aplicar}
                            disabled={aplicando || nada}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1f7a47] text-white hover:brightness-95 disabled:opacity-50"
                        >
                            <span className={`material-symbols-outlined text-base ${aplicando ? 'animate-spin' : ''}`}>
                                {aplicando ? 'progress_activity' : 'check'}
                            </span>
                            Aplicar mejora
                        </button>
                        <button
                            onClick={() => setPropuesta(null)}
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

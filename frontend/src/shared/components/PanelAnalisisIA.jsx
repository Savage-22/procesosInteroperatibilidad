import { useState, useEffect } from 'react'

import { analizar, obtenerEstadoIA, obtenerGuardado, getErrorIA } from '../services/analisisService'

const SEVERIDAD = {
    alta:  { badge: 'bg-[#ffe8e8] text-[#9c1d1d]', icono: 'priority_high', borde: 'border-[#9c1d1d]/30' },
    media: { badge: 'bg-[#fef9c3] text-[#854d0e]', icono: 'warning',       borde: 'border-[#854d0e]/25' },
    baja:  { badge: 'bg-[#dcf8e8] text-[#1f7a47]', icono: 'info',          borde: 'border-[#1f7a47]/25' },
}

const PRIORIDAD = {
    alta:  'bg-[#9c1d1d] text-white',
    media: 'bg-[#f4d100] text-[#1e3654]',
    baja:  'bg-gray-200 text-gray-600',
}

const estilo = (mapa, clave, defecto) => mapa[String(clave).toLowerCase()] ?? defecto

function Hallazgo({ hallazgo }) {
    const s = estilo(SEVERIDAD, hallazgo.severidad, SEVERIDAD.media)
    return (
        <div className={`rounded-lg border ${s.borde} bg-white p-3`}>
            <div className="flex items-start gap-2">
                <span className={`material-symbols-outlined text-base shrink-0 mt-0.5 px-1 rounded ${s.badge}`}>
                    {s.icono}
                </span>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1e3654]">{hallazgo.titulo}</p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{hallazgo.detalle}</p>
                    {hallazgo.procesos?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                            {hallazgo.procesos.map((p) => (
                                <span key={p} className="px-1.5 py-0.5 rounded bg-[#f2f4f7] text-[10px] font-mono font-semibold text-[#1e3654]">
                                    {p}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function Recomendacion({ recomendacion, numero }) {
    return (
        <div className="flex gap-3 items-start rounded-lg bg-white border border-gray-100 p-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-[#1e3654] text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {numero}
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#1e3654]">{recomendacion.accion}</p>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{recomendacion.justificacion}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${estilo(PRIORIDAD, recomendacion.prioridad, PRIORIDAD.baja)}`}>
                        {recomendacion.prioridad}
                    </span>
                    {recomendacion.plazo && (
                        <span className="px-2 py-0.5 rounded-full bg-[#f2f4f7] text-[10px] font-medium text-gray-600">
                            {recomendacion.plazo}
                        </span>
                    )}
                    {recomendacion.procesos?.map((p) => (
                        <span key={p} className="px-1.5 py-0.5 rounded bg-[#f2f4f7] text-[10px] font-mono font-semibold text-[#1e3654]">
                            {p}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    )
}

/**
 * Análisis de la sección actual generado por la IA sobre los datos reales.
 *
 * Se pide bajo demanda —no al montar— porque cada análisis es una llamada
 * facturada al proveedor y el usuario no siempre lo necesita. Si la IA no está
 * configurada en el servidor, el panel no se muestra en absoluto.
 */
export default function PanelAnalisisIA({ seccion, codigo, periodo, titulo = 'Análisis con IA', descripcion }) {
    const [disponible, setDisponible] = useState(false)
    const [generado, setGenerado] = useState(null)
    const [cargando, setCargando] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        let activo = true
        obtenerEstadoIA().then((estado) => { if (activo) setDisponible(estado.disponible) })
        return () => { activo = false }
    }, [])

    // El análisis se guarda junto a los parámetros con los que se pidió: si el
    // usuario cambia de proceso o de periodo, el anterior deja de mostrarse sin
    // necesidad de un efecto que lo limpie. La misma clave es el alcance con el
    // que el servidor lo archiva.
    const clave = `${seccion}|${codigo ?? ''}|${periodo ?? ''}`
    const analisis = generado?.clave === clave ? generado.datos : null
    const errorVigente = error?.clave === clave ? error.mensaje : null

    // Recupera el análisis ya archivado para estos parámetros, para que cambiar
    // de vista no obligue a pagar otra llamada al proveedor.
    useEffect(() => {
        let activo = true
        obtenerGuardado('seccion', clave).then((guardado) => {
            if (activo && guardado) setGenerado({ clave, datos: guardado.contenido })
        })
        return () => { activo = false }
    }, [clave])

    async function generar() {
        setCargando(true)
        setError(null)
        try {
            setGenerado({ clave, datos: await analizar(seccion, { codigo, periodo }) })
        } catch (err) {
            setError({ clave, mensaje: getErrorIA(err) })
        } finally {
            setCargando(false)
        }
    }

    if (!disponible) return null

    return (
        <section className="bg-gradient-to-br from-[#f2f4f7] to-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4 no-print">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#1e3654] bg-[#f4d100] rounded-lg p-1.5">
                        auto_awesome
                    </span>
                    <div>
                        <h2 className="text-base font-semibold text-[#1e3654]">{titulo}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {descripcion ?? 'La IA interpreta los datos de esta sección y propone acciones concretas.'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={generar}
                    disabled={cargando}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56] disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined text-base ${cargando ? 'animate-spin' : ''}`}>
                        {cargando ? 'progress_activity' : analisis ? 'refresh' : 'auto_awesome'}
                    </span>
                    {cargando ? 'Analizando…' : analisis ? 'Volver a analizar' : 'Analizar'}
                </button>
            </div>

            {errorVigente && (
                <p className="flex items-center gap-2 text-sm text-[#9c1d1d] bg-[#ffe8e8] rounded-lg px-3 py-2">
                    <span className="material-symbols-outlined text-base">error</span>{errorVigente}
                </p>
            )}

            {cargando && !analisis && (
                <p className="text-sm text-gray-400 py-4 text-center">
                    Leyendo los datos y redactando el diagnóstico…
                </p>
            )}

            {analisis && (
                <div className="space-y-4">
                    {analisis.diagnostico && (
                        <p className="text-sm text-gray-700 leading-relaxed bg-white rounded-lg border border-gray-100 p-3">
                            {analisis.diagnostico}
                        </p>
                    )}

                    {analisis.hallazgos?.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hallazgos</p>
                            {analisis.hallazgos.map((h, i) => <Hallazgo key={i} hallazgo={h} />)}
                        </div>
                    )}

                    {analisis.recomendaciones?.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recomendaciones</p>
                            {analisis.recomendaciones.map((r, i) => (
                                <Recomendacion key={i} recomendacion={r} numero={i + 1} />
                            ))}
                        </div>
                    )}

                    <p className="text-[10px] text-gray-400 italic">
                        Generado por IA a partir de los datos cargados. Revisa las conclusiones antes de decidir.
                    </p>
                </div>
            )}
        </section>
    )
}

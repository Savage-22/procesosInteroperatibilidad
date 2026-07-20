import { useState, useEffect, useCallback } from 'react'

import {
    obtenerEstadoIA,
    obtenerGuardado,
    descartarGuardado,
    getErrorIA,
} from '../services/analisisService'

const IMPACTO = {
    alto:  'bg-[#ffe8e8] text-[#9c1d1d]',
    medio: 'bg-[#fef9c3] text-[#854d0e]',
    bajo:  'bg-[#dcf8e8] text-[#1f7a47]',
}

function Riesgo({ riesgo }) {
    const color = IMPACTO[String(riesgo.impacto).toLowerCase()] ?? IMPACTO.medio
    return (
        <li className="rounded-lg border border-gray-100 p-3">
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-700">{riesgo.riesgo}</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${color}`}>
                    {riesgo.impacto}
                </span>
            </div>
            {riesgo.mitigacion && (
                <p className="text-xs text-gray-500 mt-1">
                    <span className="font-semibold text-gray-600">Mitigación: </span>{riesgo.mitigacion}
                </p>
            )}
        </li>
    )
}

function fechaLegible(iso) {
    if (!iso) return null
    const fecha = new Date(iso)
    return Number.isNaN(fecha.getTime())
        ? null
        : fecha.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })
}

/**
 * Informe redactado por la IA: ejecutivo, por módulo o comparativo. Los tres
 * comparten esquema, así que comparten componente.
 *
 * El informe se archiva en el servidor al generarlo y se recupera al montar,
 * de modo que cambiar de vista o recargar ya no lo pierde: redactarlo cuesta
 * una llamada facturada. `alcance` distingue un archivo de otro (el módulo, o
 * los procesos comparados).
 */
export default function InformeIA({
    tipo,
    alcance = '',
    onGenerar,
    titulo,
    descripcion,
    icono = 'summarize',
    deshabilitado = false,
    motivoDeshabilitado,
}) {
    const [disponible, setDisponible] = useState(false)
    const [archivado, setArchivado] = useState(null)
    const [cargando, setCargando] = useState(false)
    const [error, setError] = useState(null)

    // Informe y error se guardan junto al alcance con el que se obtuvieron: al
    // cambiar de módulo o de selección dejan de mostrarse solos, sin un efecto
    // que los limpie y sin el parpadeo de un render intermedio.
    const clave = `${tipo}|${alcance}`
    const informe = archivado?.clave === clave ? archivado.contenido : null
    const errorVigente = error?.clave === clave ? error.mensaje : null

    useEffect(() => {
        let activo = true
        obtenerEstadoIA().then((estado) => { if (activo) setDisponible(estado.disponible) })
        return () => { activo = false }
    }, [])

    // Recupera lo ya archivado en el servidor para este alcance
    useEffect(() => {
        let activo = true
        obtenerGuardado(tipo, alcance).then((guardado) => {
            if (activo && guardado) {
                setArchivado({ clave, contenido: guardado.contenido, generadoEn: guardado.generado_en })
            }
        })
        return () => { activo = false }
    }, [tipo, alcance, clave])

    const generar = useCallback(async () => {
        setCargando(true)
        setError(null)
        try {
            setArchivado({
                clave,
                contenido: await onGenerar(),
                generadoEn: new Date().toISOString(),
            })
        } catch (err) {
            setError({ clave, mensaje: getErrorIA(err) })
        } finally {
            setCargando(false)
        }
    }, [onGenerar, clave])

    async function descartar() {
        setArchivado(null)
        await descartarGuardado(tipo, alcance)
    }

    if (!disponible) return null

    const fecha = informe ? fechaLegible(archivado.generadoEn) : null

    return (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-start justify-between gap-3 flex-wrap p-5 no-print">
                <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#1e3654] bg-[#f4d100] rounded-lg p-1.5">
                        {icono}
                    </span>
                    <div>
                        <h2 className="text-base font-semibold text-[#1e3654]">{titulo}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{descripcion}</p>
                        {fecha && (
                            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">history</span>
                                Generado el {fecha} · se conserva hasta que lo regeneres
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    {informe && (
                        <>
                            <button
                                onClick={descartar}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50"
                            >
                                <span className="material-symbols-outlined text-base">delete</span>
                                Descartar
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#1e3654] border border-gray-200 hover:bg-gray-50"
                            >
                                <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                                PDF
                            </button>
                        </>
                    )}
                    <button
                        onClick={generar}
                        disabled={cargando || deshabilitado}
                        title={deshabilitado ? motivoDeshabilitado : undefined}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56] disabled:opacity-50"
                    >
                        <span className={`material-symbols-outlined text-base ${cargando ? 'animate-spin' : ''}`}>
                            {cargando ? 'progress_activity' : informe ? 'refresh' : 'auto_awesome'}
                        </span>
                        {cargando ? 'Redactando…' : informe ? 'Regenerar' : 'Generar informe'}
                    </button>
                </div>
            </div>

            {deshabilitado && motivoDeshabilitado && !informe && (
                <p className="mx-5 mb-5 text-xs text-gray-500 no-print">{motivoDeshabilitado}</p>
            )}

            {errorVigente && (
                <p className="mx-5 mb-5 flex items-center gap-2 text-sm text-[#9c1d1d] bg-[#ffe8e8] rounded-lg px-3 py-2 no-print">
                    <span className="material-symbols-outlined text-base">error</span>{errorVigente}
                </p>
            )}

            {cargando && !informe && (
                <p className="px-5 pb-5 text-sm text-gray-400 text-center no-print">
                    Leyendo los datos y redactando el informe…
                </p>
            )}

            {informe && (
                <div className="zona-imprimible px-5 pb-5 space-y-5 border-t border-gray-100 pt-5">
                    <header>
                        <h3 className="text-lg font-bold text-[#1e3654]">{informe.titulo}</h3>
                        <p className="text-sm text-gray-700 leading-relaxed mt-2 bg-[#f2f4f7] rounded-lg p-3">
                            {informe.resumen_ejecutivo}
                        </p>
                    </header>

                    {informe.secciones?.map((seccion, i) => (
                        <div key={i}>
                            <h4 className="text-sm font-semibold text-[#1e3654] border-b border-gray-100 pb-1 mb-2">
                                {seccion.titulo}
                            </h4>
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                                {seccion.contenido}
                            </p>
                        </div>
                    ))}

                    {informe.riesgos?.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-[#1e3654] border-b border-gray-100 pb-1 mb-2">
                                Riesgos identificados
                            </h4>
                            <ul className="space-y-2">
                                {informe.riesgos.map((r, i) => <Riesgo key={i} riesgo={r} />)}
                            </ul>
                        </div>
                    )}

                    {informe.prioridades?.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-[#1e3654] border-b border-gray-100 pb-1 mb-2">
                                Prioridades de acción
                            </h4>
                            <ol className="space-y-2">
                                {informe.prioridades.map((p, i) => (
                                    <li key={i} className="flex gap-3 items-start">
                                        <span className="shrink-0 w-6 h-6 rounded-full bg-[#1e3654] text-white text-xs font-bold flex items-center justify-center mt-0.5">
                                            {p.orden ?? i + 1}
                                        </span>
                                        <div>
                                            <p className="text-sm text-gray-700">{p.accion}</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                {[p.responsable_sugerido, p.plazo].filter(Boolean).join(' · ')}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {informe.conclusion && (
                        <p className="text-sm text-gray-700 leading-relaxed border-l-4 border-[#f4d100] pl-3 py-1">
                            {informe.conclusion}
                        </p>
                    )}

                    <p className="text-[10px] text-gray-400 italic pt-2 border-t border-gray-100">
                        Informe generado por IA a partir de los datos cargados en el sistema.
                        Revísalo antes de difundirlo.
                    </p>
                </div>
            )}
        </section>
    )
}

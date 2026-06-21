import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import SemaforoBadge from '../../../shared/components/SemaforoBadge'
import { useDatos } from '../../../shared/hooks/useDatos'
import { getObjetivos } from '../api/objetivosApi'

// ── helpers ──────────────────────────────────────────────────────────────────

function BarraAvance({ avance, semaforo }) {
    const pct = Math.min(avance ?? 0, 100)
    const color =
        semaforo === 'Verde'    ? 'bg-[#1f7a47]' :
        semaforo === 'Amarillo' ? 'bg-[#f4d100]' :
        semaforo === 'Rojo'     ? 'bg-[#9c1d1d]' : 'bg-gray-300'
    return (
        <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-[#1e3654] w-10 text-right shrink-0">
                {avance != null ? `${avance}%` : '—'}
            </span>
        </div>
    )
}

// ── fila de proceso ───────────────────────────────────────────────────────────

function FilaProceso({ proceso, onNavigate }) {
    return (
        <tr
            onClick={() => onNavigate(`/proceso/${proceso.codigo}`)}
            className="hover:bg-[#f2f4f7] cursor-pointer transition-colors"
        >
            <td className="pl-12 pr-4 py-2.5 font-mono text-sm font-semibold text-[#1e3654]">
                {proceso.codigo}
            </td>
            <td className="px-4 py-2.5 text-sm text-gray-700 max-w-xs truncate">{proceso.proceso}</td>
            <td className="px-4 py-2.5 text-xs text-gray-500">{proceso.modulo}</td>
            <td className="px-4 py-2.5">
                <BarraAvance avance={proceso.avance} semaforo={proceso.semaforo} />
            </td>
            <td className="px-4 py-2.5"><SemaforoBadge semaforo={proceso.semaforo} /></td>
        </tr>
    )
}

// ── bloque de acción (colapsable) ─────────────────────────────────────────────

function BloqueAccion({ accion, onNavigate }) {
    const [abierta, setAbierta] = useState(true)
    return (
        <div className="border border-gray-100 rounded-lg overflow-hidden">
            <button
                onClick={() => setAbierta(p => !p)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#f8fafc] hover:bg-[#f2f4f7] transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-gray-400 text-base">bolt</span>
                    <span className="text-sm font-medium text-[#1e3654]">{accion.accion}</span>
                    <span className="text-xs text-gray-400">
                        {accion.procesos.length} proceso{accion.procesos.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <BarraAvance avance={accion.avance} semaforo={accion.semaforo} />
                    <SemaforoBadge semaforo={accion.semaforo} />
                    <span className="material-symbols-outlined text-gray-400 text-base">
                        {abierta ? 'expand_less' : 'expand_more'}
                    </span>
                </div>
            </button>

            {abierta && (
                <table className="w-full text-sm">
                    <thead className="bg-[#f2f4f7] text-gray-500 text-xs uppercase tracking-wide">
                        <tr>
                            <th className="pl-12 pr-4 py-2 text-left font-medium">Código</th>
                            <th className="px-4 py-2 text-left font-medium">Proceso</th>
                            <th className="px-4 py-2 text-left font-medium">Módulo</th>
                            <th className="px-4 py-2 text-left font-medium">Avance T1</th>
                            <th className="px-4 py-2 text-left font-medium">Semáforo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                        {accion.procesos.map(p => (
                            <FilaProceso key={p.codigo} proceso={p} onNavigate={onNavigate} />
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}

// ── bloque de objetivo (colapsable) ──────────────────────────────────────────

function BloqueObjetivo({ objetivo, onNavigate }) {
    const [abierto, setAbierto] = useState(true)
    const colorBg =
        objetivo.semaforo === 'Verde'    ? 'bg-[#d1fadf] border-[#1f7a47]/20' :
        objetivo.semaforo === 'Amarillo' ? 'bg-[#fef9c3] border-[#f4d100]/30' :
        objetivo.semaforo === 'Rojo'     ? 'bg-[#ffe8e8] border-[#9c1d1d]/20' :
                                           'bg-gray-50 border-gray-200'

    return (
        <div className={`rounded-xl border overflow-hidden ${colorBg}`}>
            <button
                onClick={() => setAbierto(p => !p)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:brightness-95 transition-all"
            >
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#1e3654] text-xl">flag</span>
                    <div>
                        <p className="font-semibold text-[#1e3654] text-sm">{objetivo.objetivo}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {objetivo.acciones.length} acción{objetivo.acciones.length !== 1 ? 'es' : ''} ·{' '}
                            {objetivo.acciones.reduce((s, a) => s + a.procesos.length, 0)} procesos
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <BarraAvance avance={objetivo.avance} semaforo={objetivo.semaforo} />
                    <SemaforoBadge semaforo={objetivo.semaforo} />
                    <span className="material-symbols-outlined text-gray-500 text-xl">
                        {abierto ? 'expand_less' : 'expand_more'}
                    </span>
                </div>
            </button>

            {abierto && (
                <div className="px-5 pb-5 space-y-2 bg-white/70">
                    {objetivo.acciones.map(acc => (
                        <BloqueAccion key={acc.accion} accion={acc} onNavigate={onNavigate} />
                    ))}
                </div>
            )}
        </div>
    )
}

// ── aviso cuando no hay objetivos configurados ────────────────────────────────

function AvisoSinObjetivos() {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-gray-300">flag</span>
            <p className="font-semibold text-[#1e3654]">Sin objetivos estratégicos configurados</p>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
                Agrega las columnas <strong>Objetivo Estrategico</strong> y{' '}
                <strong>Accion Estrategica</strong> a tu Excel y sube el archivo.
                Puedes descargar la plantilla actualizada desde el botón <em>Plantilla</em> del menú.
            </p>
        </div>
    )
}

// ── página principal ──────────────────────────────────────────────────────────

export default function ObjetivosPage() {
    const navigate = useNavigate()
    const { version } = useDatos()
    const [datos, setDatos] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let isMounted = true
        async function cargar() {
            try {
                const res = await getObjetivos()
                if (isMounted) { setDatos(res.data); setError(null) }
            } catch {
                if (isMounted) setError('No se pudo cargar los objetivos. Verifica que el servidor esté activo.')
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
            Cargando objetivos…
        </div>
    )

    if (error) return (
        <div className="flex items-center gap-2 p-6 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl">
            <span className="material-symbols-outlined">error</span>
            {error}
        </div>
    )

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#1e3654]">Objetivos estratégicos</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Avance T1 agrupado por objetivo y acción estratégica
                </p>
            </div>

            {!datos?.tiene_datos
                ? <AvisoSinObjetivos />
                : (
                    <div className="space-y-4">
                        {datos.objetivos.map(obj => (
                            <BloqueObjetivo key={obj.objetivo} objetivo={obj} onNavigate={navigate} />
                        ))}
                    </div>
                )
            }
        </div>
    )
}

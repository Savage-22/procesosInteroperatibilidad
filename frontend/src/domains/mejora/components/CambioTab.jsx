import { useState, useEffect } from 'react'

import { obtenerCambio, guardarAccionCambio, borrarAccionCambio, getErrorMessage } from '../services/mejoraService'
import InformeLewin from './InformeLewin'

const INP = 'w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3654]/20'

// Estilo y ayuda por etapa del modelo de Kurt Lewin
const ETAPA_META = {
    descongelar: { icono: 'ac_unit', color: '#0075ca', bg: '#eff6ff', paso: 1 },
    cambiar: { icono: 'sync', color: '#b45309', bg: '#fffbeb', paso: 2 },
    recongelar: { icono: 'check_circle', color: '#1f7a47', bg: '#ecfdf5', paso: 3 },
}

const ESTADO_META = {
    pendiente: { label: 'Pendiente', color: 'text-gray-500 bg-gray-100' },
    en_curso: { label: 'En curso', color: 'text-[#b45309] bg-[#fffbeb]' },
    hecho: { label: 'Hecho', color: 'text-[#1f7a47] bg-[#ecfdf5]' },
}
const ESTADOS = ['pendiente', 'en_curso', 'hecho']

function ProgresoBar({ progreso }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-[#1e3654]">Progreso del cambio</p>
                <p className="text-xs text-gray-500">{progreso.hechas} de {progreso.total} acciones · {progreso.porcentaje}%</p>
            </div>
            <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#1f7a47] rounded-full transition-all" style={{ width: `${progreso.porcentaje}%` }} />
            </div>
        </div>
    )
}

function AccionItem({ accion, onEstado, onEliminar }) {
    const est = ESTADO_META[accion.estado] || ESTADO_META.pendiente
    return (
        <div className="bg-white rounded-lg border border-gray-100 p-2.5 space-y-1.5">
            <div className="flex items-start gap-1">
                <p className="flex-1 text-sm text-gray-700">{accion.descripcion}</p>
                <button onClick={() => onEliminar(accion)} title="Eliminar acción" className="text-gray-300 hover:text-[#9c1d1d]">
                    <span className="material-symbols-outlined text-base">delete</span>
                </button>
            </div>
            {(accion.responsable || accion.fecha) && (
                <p className="flex items-center gap-2 text-xs text-gray-400">
                    {accion.responsable && <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-sm">person</span>{accion.responsable}</span>}
                    {accion.fecha && <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-sm">event</span>{accion.fecha}</span>}
                </p>
            )}
            <select
                value={accion.estado}
                onChange={(e) => onEstado(accion, e.target.value)}
                className={`text-xs font-medium rounded px-1.5 py-0.5 border-0 cursor-pointer ${est.color}`}
            >
                {ESTADOS.map((s) => <option key={s} value={s}>{ESTADO_META[s].label}</option>)}
            </select>
        </div>
    )
}

function NuevaAccion({ etapa, onAgregar }) {
    const [form, setForm] = useState({ descripcion: '', responsable: '', fecha: '' })
    const [abierto, setAbierto] = useState(false)
    const set = (c) => (e) => setForm((f) => ({ ...f, [c]: e.target.value }))

    async function agregar() {
        if (!form.descripcion.trim()) return
        await onAgregar({ etapa, ...form })
        setForm({ descripcion: '', responsable: '', fecha: '' })
        setAbierto(false)
    }

    if (!abierto) return (
        <button onClick={() => setAbierto(true)} className="flex items-center justify-center gap-1 w-full py-1.5 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-[#1e3654] hover:text-[#1e3654]">
            <span className="material-symbols-outlined text-sm">add</span> Agregar acción
        </button>
    )

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-2.5 space-y-2">
            <input value={form.descripcion} onChange={set('descripcion')} onKeyDown={(e) => e.key === 'Enter' && agregar()} placeholder="¿Qué acción harás?" className={INP} autoFocus />
            <input value={form.responsable} onChange={set('responsable')} placeholder="Responsable (opcional)" className={INP} />
            <input value={form.fecha} onChange={set('fecha')} type="date" className={INP} title="Fecha compromiso (opcional)" />
            <div className="flex justify-end gap-1">
                <button onClick={() => setAbierto(false)} className="px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-100">Cancelar</button>
                <button onClick={agregar} className="px-2.5 py-1 rounded bg-[#1e3654] text-white text-xs font-medium hover:bg-[#0c2f56]">Agregar</button>
            </div>
        </div>
    )
}

function EtapaColumna({ etapa, info, acciones, onAgregar, onEstado, onEliminar }) {
    const meta = ETAPA_META[etapa]
    return (
        <div className="rounded-xl border border-gray-100 shadow-sm p-4 space-y-3" style={{ backgroundColor: meta.bg }}>
            <div>
                <h3 className="flex items-center gap-1.5 font-bold" style={{ color: meta.color }}>
                    <span className="material-symbols-outlined text-lg">{meta.icono}</span>
                    <span className="text-xs font-semibold opacity-70">Paso {meta.paso}</span> · {info.titulo}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{info.resumen}</p>
                <p className="text-[11px] text-gray-400 mt-1">{info.detalle}</p>
            </div>
            <div className="space-y-2">
                {acciones.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Sin acciones todavía.</p>}
                {acciones.map((a) => (
                    <AccionItem key={a.id} accion={a} onEstado={onEstado} onEliminar={onEliminar} />
                ))}
            </div>
            <NuevaAccion etapa={etapa} onAgregar={onAgregar} />
        </div>
    )
}

export default function CambioTab({ codigo }) {
    const [datos, setDatos] = useState(null)
    const [error, setError] = useState(null)
    const [verInforme, setVerInforme] = useState(false)

    async function cargar() {
        try { setDatos(await obtenerCambio(codigo)); setError(null) }
        catch (err) { setError(getErrorMessage(err)) }
    }

    useEffect(() => {
        let m = true
        obtenerCambio(codigo).then((d) => m && setDatos(d)).catch((e) => m && setError(getErrorMessage(e)))
        return () => { m = false }
    }, [codigo])

    async function agregar(datosAccion) { await guardarAccionCambio(codigo, datosAccion); await cargar() }
    async function cambiarEstado(accion, estado) { await guardarAccionCambio(codigo, { estado }, accion.id); await cargar() }
    async function eliminar(accion) {
        if (!window.confirm(`¿Eliminar la acción "${accion.descripcion}"?`)) return
        await borrarAccionCambio(accion.id); await cargar()
    }

    if (error) return <div className="flex items-center gap-2 p-4 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl text-sm"><span className="material-symbols-outlined">error</span>{error}</div>
    if (!datos) return <p className="text-gray-400 text-sm">Cargando…</p>

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between gap-3 flex-wrap no-print">
                <p className="text-sm text-gray-500 max-w-2xl">
                    Gestiona el cambio con el modelo de <strong>Kurt Lewin</strong>: <strong>Descongelar</strong> (preparar) →
                    <strong> Cambiar</strong> (implementar) → <strong>Recongelar</strong> (consolidar). Registra acciones en cada etapa
                    con su responsable, fecha y estado.
                </p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setVerInforme((v) => !v)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#1e3654] border border-gray-200 hover:bg-gray-50"
                    >
                        <span className="material-symbols-outlined text-base">{verInforme ? 'edit' : 'description'}</span>
                        {verInforme ? 'Volver a editar' : 'Ver informe'}
                    </button>
                    {verInforme && (
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56]"
                        >
                            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                            Imprimir
                        </button>
                    )}
                </div>
            </div>

            {verInforme ? (
                <InformeLewin codigo={datos.codigo ?? codigo} proceso={datos.proceso} datos={datos} />
            ) : (
                <>
                    <ProgresoBar progreso={datos.progreso} />
                    <div className="grid gap-4 md:grid-cols-3">
                        {datos.etapas.map((e) => (
                            <EtapaColumna
                                key={e}
                                etapa={e}
                                info={datos.info[e]}
                                acciones={datos.acciones[e]}
                                onAgregar={agregar}
                                onEstado={cambiarEstado}
                                onEliminar={eliminar}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

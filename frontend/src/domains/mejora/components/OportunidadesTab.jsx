import { useState, useEffect } from 'react'

import { obtenerOportunidades, guardarOportunidad, borrarOportunidad, getErrorMessage } from '../services/mejoraService'

const INP = 'w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3654]/20'
const ESCALA = [1, 2, 3, 4, 5]
const ESTRATEGIAS = ['evitar', 'mitigar', 'transferir', 'aceptar']
const ESTADOS = ['propuesta', 'en_curso', 'implementada', 'descartada']

const plazoColor = (p) => p === 'Inmediato' ? 'bg-[#d1fadf] text-[#1f7a47]' : p === 'Corto plazo' ? 'bg-[#fef9c3] text-[#854d0e]' : 'bg-[#ffe8e8] text-[#9c1d1d]'
const riesgoColor = (n) => ({ Bajo: 'bg-[#d1fadf] text-[#1f7a47]', Medio: 'bg-[#fef9c3] text-[#854d0e]', Alto: 'bg-[#ffedd5] text-[#c2410c]', Extremo: 'bg-[#ffe8e8] text-[#9c1d1d]' }[n] || 'bg-gray-100 text-gray-500')

const plazoDe = (f) => f <= 7 ? 'Inmediato' : f <= 14 ? 'Corto plazo' : 'Analizar'
const nivelDe = (r) => r <= 4 ? 'Bajo' : r <= 9 ? 'Medio' : r <= 14 ? 'Alto' : 'Extremo'

const FORM = { descripcion: '', accion_propuesta: '', tipo: '', costo: 3, impacto: 3, probabilidad: 3, consecuencia: 3, estrategia: 'mitigar', estado: 'propuesta' }

// Matriz cualitativa probabilidad × consecuencia con la celda seleccionada resaltada
function Matriz({ probabilidad, consecuencia }) {
    return (
        <div>
            <p className="text-xs font-semibold text-[#1e3654] mb-1">Matriz probabilidad × consecuencia</p>
            <div className="flex">
                <div className="flex flex-col justify-around text-[10px] text-gray-400 pr-1 [writing-mode:vertical-rl] rotate-180">probabilidad →</div>
                <div className="grid grid-cols-5 gap-0.5">
                    {[5, 4, 3, 2, 1].map((p) => ESCALA.map((c) => {
                        const r = p * c
                        const activa = p === probabilidad && c === consecuencia
                        return (
                            <div key={`${p}-${c}`} className={`w-7 h-7 rounded text-[10px] flex items-center justify-center ${riesgoColor(nivelDe(r))} ${activa ? 'ring-2 ring-[#1e3654] font-bold' : 'opacity-70'}`}>
                                {r}
                            </div>
                        )
                    }))}
                </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5 text-center">consecuencia →</p>
        </div>
    )
}

function SelectEscala({ label, value, onChange }) {
    return (
        <label className="block">
            <span className="block text-xs font-semibold text-[#1e3654] mb-1">{label}</span>
            <select value={value} onChange={onChange} className={INP}>
                {ESCALA.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
        </label>
    )
}

function Formulario({ onGuardado }) {
    const [form, setForm] = useState(FORM)
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState(null)
    const set = (c, esNum) => (e) => setForm((f) => ({ ...f, [c]: esNum ? Number(e.target.value) : e.target.value }))

    const F = form.costo * form.impacto
    const riesgo = form.probabilidad * form.consecuencia

    async function guardar() {
        if (!form.descripcion.trim()) { setError('Describe la oportunidad'); return }
        setGuardando(true); setError(null)
        try { await onGuardado(form); setForm(FORM) }
        catch (err) { setError(getErrorMessage(err)) }
        finally { setGuardando(false) }
    }

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#1e3654]">Nueva oportunidad de mejora</h3>
            <div className="grid sm:grid-cols-2 gap-3">
                <label className="block sm:col-span-2">
                    <span className="block text-xs font-semibold text-[#1e3654] mb-1">Descripción *</span>
                    <input value={form.descripcion} onChange={set('descripcion')} placeholder="Oportunidad detectada a partir de la causa raíz" className={INP} />
                </label>
                <label className="block sm:col-span-2">
                    <span className="block text-xs font-semibold text-[#1e3654] mb-1">Acción propuesta</span>
                    <input value={form.accion_propuesta} onChange={set('accion_propuesta')} placeholder="Qué se hará para aprovecharla" className={INP} />
                </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                        <SelectEscala label="Costo (C)" value={form.costo} onChange={set('costo', true)} />
                        <SelectEscala label="Impacto (I)" value={form.impacto} onChange={set('impacto', true)} />
                        <SelectEscala label="Probabilidad" value={form.probabilidad} onChange={set('probabilidad', true)} />
                        <SelectEscala label="Consecuencia" value={form.consecuencia} onChange={set('consecuencia', true)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="block text-xs font-semibold text-[#1e3654] mb-1">Estrategia</span>
                            <select value={form.estrategia} onChange={set('estrategia')} className={INP}>{ESTRATEGIAS.map((s) => <option key={s}>{s}</option>)}</select>
                        </label>
                        <label className="block">
                            <span className="block text-xs font-semibold text-[#1e3654] mb-1">Estado</span>
                            <select value={form.estado} onChange={set('estado')} className={INP}>{ESTADOS.map((s) => <option key={s}>{s}</option>)}</select>
                        </label>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center gap-3 bg-[#f8fafc] rounded-lg p-3">
                    <Matriz probabilidad={form.probabilidad} consecuencia={form.consecuencia} />
                    <div className="flex gap-2 text-center">
                        <div className={`px-3 py-1.5 rounded-lg ${plazoColor(plazoDe(F))}`}>
                            <p className="text-[10px] uppercase">F = C×I</p>
                            <p className="font-bold">{F} · {plazoDe(F)}</p>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg ${riesgoColor(nivelDe(riesgo))}`}>
                            <p className="text-[10px] uppercase">Riesgo</p>
                            <p className="font-bold">{riesgo} · {nivelDe(riesgo)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {error && <p className="text-sm text-[#9c1d1d]">{error}</p>}
            <button onClick={guardar} disabled={guardando} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56] disabled:opacity-50">
                {guardando && <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>}
                Agregar oportunidad
            </button>
        </div>
    )
}

export default function OportunidadesTab({ codigo }) {
    const [items, setItems] = useState(null)
    const [error, setError] = useState(null)

    async function cargar() {
        try { setItems(await obtenerOportunidades(codigo)); setError(null) }
        catch (err) { setError(getErrorMessage(err)) }
    }

    useEffect(() => {
        let m = true
        obtenerOportunidades(codigo).then((d) => m && setItems(d)).catch((e) => m && setError(getErrorMessage(e)))
        return () => { m = false }
    }, [codigo])

    async function agregar(form) { await guardarOportunidad(codigo, form); await cargar() }
    async function eliminar(o) { await borrarOportunidad(o.id); await cargar() }

    if (error) return <div className="flex items-center gap-2 p-4 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl text-sm"><span className="material-symbols-outlined">error</span>{error}</div>
    if (!items) return <p className="text-gray-400 text-sm">Cargando…</p>

    return (
        <div className="space-y-5">
            <p className="text-sm text-gray-500">
                Registra oportunidades y su acción. El sistema calcula la <strong>factibilidad F = C × I</strong> y recomienda el plazo
                (Inmediato ≤ 7, Corto plazo ≤ 14, Analizar &gt; 14), además del nivel de riesgo por la matriz.
            </p>
            <Formulario onGuardado={agregar} />

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100"><h3 className="text-sm font-bold text-[#1e3654]">Oportunidades priorizadas</h3></div>
                {items.length === 0 ? (
                    <p className="text-sm text-gray-400 p-5">Aún no hay oportunidades registradas.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[640px]">
                            <thead className="bg-[#f2f4f7] text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="text-left font-medium px-4 py-2">Oportunidad / Acción</th>
                                    <th className="text-center font-medium px-3 py-2">C×I</th>
                                    <th className="text-center font-medium px-3 py-2">Plazo</th>
                                    <th className="text-center font-medium px-3 py-2">Riesgo</th>
                                    <th className="text-center font-medium px-3 py-2">Estado</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {items.map((o) => (
                                    <tr key={o.id}>
                                        <td className="px-4 py-2.5">
                                            <p className="text-gray-800">{o.descripcion}</p>
                                            {o.accion_propuesta && <p className="text-xs text-gray-400">{o.accion_propuesta}</p>}
                                        </td>
                                        <td className="px-3 py-2.5 text-center font-semibold text-[#1e3654]">{o.factibilidad}</td>
                                        <td className="px-3 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${plazoColor(o.plazo)}`}>{o.plazo}</span></td>
                                        <td className="px-3 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riesgoColor(o.nivel_riesgo)}`}>{o.nivel_riesgo}</span></td>
                                        <td className="px-3 py-2.5 text-center text-xs text-gray-500">{o.estado}</td>
                                        <td className="px-3 py-2.5 text-right">
                                            <button onClick={() => eliminar(o)} className="text-gray-300 hover:text-[#9c1d1d]"><span className="material-symbols-outlined text-base">delete</span></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

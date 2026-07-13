import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import SemaforoBadge from '../../../shared/components/SemaforoBadge'
import { useDatos } from '../../../shared/hooks/useDatos'
import {
    obtenerIndicadores,
    guardarIndicador,
    borrarIndicador,
    capturarMedicion,
    borrarMedicion,
    getErrorMessage,
} from '../services/indicadoresService'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const TIPOS = ['eficacia', 'eficiencia', 'efectividad']
const SENTIDOS = ['Ascendente', 'Descendente']

const AYUDA = {
    tipo: 'Eficacia: cumplimiento del resultado. Eficiencia: uso de recursos (tiempo/costo). Efectividad: impacto real.',
    sentido: 'Ascendente: más es mejor (ej. % atención). Descendente: menos es mejor (ej. días de demora).',
    formula: 'Cómo se calcula. Ej.: (N° solicitudes atendidas / N° solicitudes recibidas) × 100.',
}

const num = (v) => (v === '' || v == null ? null : Number(v))

const INP = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3654]/20'

// ── formulario de indicador (modal) ───────────────────────────────────────────

function FormularioIndicador({ estado, onGuardar, onCerrar }) {
    const editando = estado.mode === 'editar'
    const ind = estado.indicador ?? {}
    const [form, setForm] = useState({
        nombre: ind.nombre ?? '', tipo: ind.tipo ?? '', sentido: ind.sentido ?? 'Ascendente',
        unidad: ind.unidad ?? '', meta_final: ind.meta_final ?? '', linea_base: ind.linea_base ?? '',
        formula: ind.formula ?? '', fuente: ind.fuente ?? '', responsable: ind.responsable ?? '',
        relevancia: ind.relevancia ?? 1,
    })
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState(null)
    const set = (c) => (e) => setForm((f) => ({ ...f, [c]: e.target.value }))

    async function handleSubmit(e) {
        e.preventDefault()
        if (guardando) return
        setGuardando(true)
        setError(null)
        try {
            await onGuardar({
                ...form,
                meta_final: num(form.meta_final),
                linea_base: num(form.linea_base),
                relevancia: Number(form.relevancia),
            }, editando ? ind.id : null)
        } catch (err) {
            setError(getErrorMessage(err))
            setGuardando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCerrar}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="font-bold text-[#1e3654]">{editando ? 'Editar indicador' : 'Nuevo indicador'}</h2>
                    <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    <CampoIndicador etiqueta="Nombre del indicador" requerido>
                        <input value={form.nombre} onChange={set('nombre')} placeholder="% de solicitudes atendidas" className={INP} />
                    </CampoIndicador>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <CampoIndicador etiqueta="Tipo" ayuda={AYUDA.tipo}>
                            <select value={form.tipo} onChange={set('tipo')} className={INP}>
                                <option value="">Seleccionar…</option>
                                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </CampoIndicador>
                        <CampoIndicador etiqueta="Sentido" ayuda={AYUDA.sentido}>
                            <select value={form.sentido} onChange={set('sentido')} className={INP}>
                                {SENTIDOS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </CampoIndicador>
                        <CampoIndicador etiqueta="Unidad">
                            <input value={form.unidad} onChange={set('unidad')} placeholder="% / días" className={INP} />
                        </CampoIndicador>
                        <CampoIndicador etiqueta="Relevancia">
                            <select value={form.relevancia} onChange={set('relevancia')} className={INP}>
                                <option value={1}>1 · Muy relevante</option>
                                <option value={2}>2 · Relevante</option>
                                <option value={3}>3 · Menos relevante</option>
                            </select>
                        </CampoIndicador>
                        <CampoIndicador etiqueta="Meta final">
                            <input type="number" step="any" value={form.meta_final} onChange={set('meta_final')} placeholder="90" className={INP} />
                        </CampoIndicador>
                        <CampoIndicador etiqueta="Línea base">
                            <input type="number" step="any" value={form.linea_base} onChange={set('linea_base')} placeholder="60" className={INP} />
                        </CampoIndicador>
                    </div>

                    <CampoIndicador etiqueta="Fórmula" ayuda={AYUDA.formula}>
                        <input value={form.formula} onChange={set('formula')} placeholder="(atendidas / recibidas) × 100" className={INP} />
                    </CampoIndicador>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <CampoIndicador etiqueta="Fuente de datos">
                            <input value={form.fuente} onChange={set('fuente')} placeholder="Sistema de mesa de partes" className={INP} />
                        </CampoIndicador>
                        <CampoIndicador etiqueta="Responsable">
                            <input value={form.responsable} onChange={set('responsable')} placeholder="Jefe de la unidad" className={INP} />
                        </CampoIndicador>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-[#9c1d1d] bg-[#ffe8e8] rounded-lg px-3 py-2">
                            <span className="material-symbols-outlined text-base">error</span>{error}
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onCerrar} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
                        <button type="submit" disabled={guardando} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56] disabled:opacity-50">
                            {guardando && <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>}Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function CampoIndicador({ etiqueta, ayuda, requerido, children }) {
    return (
        <label className="block">
            <span className="block text-xs font-semibold text-[#1e3654] mb-1">
                {etiqueta} {requerido && <span className="text-[#9c1d1d]">*</span>}
            </span>
            {children}
            {ayuda && <span className="block text-xs text-gray-400 mt-1">{ayuda}</span>}
        </label>
    )
}

// ── tabla de mediciones + captura ─────────────────────────────────────────────

function TablaMediciones({ indicador, onGuardarMedicion, onEliminarMedicion }) {
    const [fila, setFila] = useState({ mes: '', anio: new Date().getFullYear(), numerador: '', denominador: '', resultado_esperado: '' })
    const [guardando, setGuardando] = useState(false)
    const set = (c) => (e) => setFila((f) => ({ ...f, [c]: e.target.value }))

    async function agregar() {
        if (!fila.mes || guardando) return
        setGuardando(true)
        try {
            await onGuardarMedicion(indicador.id, {
                mes: fila.mes, anio: num(fila.anio),
                numerador: num(fila.numerador), denominador: num(fila.denominador),
                resultado_esperado: num(fila.resultado_esperado),
            })
            setFila((f) => ({ ...f, mes: '', numerador: '', denominador: '', resultado_esperado: '' }))
        } finally {
            setGuardando(false)
        }
    }

    return (
        <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Mediciones mensuales</p>
            <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                    <thead className="text-gray-400 text-xs">
                        <tr>
                            <th className="text-left font-medium py-1 px-2">Mes</th>
                            <th className="text-right font-medium py-1 px-2">Numerador</th>
                            <th className="text-right font-medium py-1 px-2">Denominador</th>
                            <th className="text-right font-medium py-1 px-2">Esperado</th>
                            <th className="text-right font-medium py-1 px-2">Obtenido</th>
                            <th className="text-center font-medium py-1 px-2">Avance</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {indicador.mediciones.map((m) => (
                            <tr key={m.id} className="text-gray-700">
                                <td className="py-1.5 px-2">{m.mes} {m.anio ?? ''}</td>
                                <td className="py-1.5 px-2 text-right">{m.numerador ?? '—'}</td>
                                <td className="py-1.5 px-2 text-right">{m.denominador ?? '—'}</td>
                                <td className="py-1.5 px-2 text-right">{m.resultado_esperado ?? '—'}</td>
                                <td className="py-1.5 px-2 text-right font-semibold text-[#1e3654]">{m.resultado_obtenido ?? '—'}</td>
                                <td className="py-1.5 px-2 text-center"><SemaforoBadge semaforo={m.semaforo} /></td>
                                <td className="py-1.5 px-2 text-right">
                                    <button onClick={() => onEliminarMedicion(m.id)} className="text-gray-300 hover:text-[#9c1d1d]" title="Eliminar medición">
                                        <span className="material-symbols-outlined text-base">delete</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-[#f8fafc]">
                            <td className="py-1.5 px-2">
                                <select value={fila.mes} onChange={set('mes')} className="w-full px-2 py-1 border border-gray-200 rounded text-xs">
                                    <option value="">Mes…</option>
                                    {MESES.map((m) => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </td>
                            <td className="py-1.5 px-2"><input type="number" step="any" value={fila.numerador} onChange={set('numerador')} className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right" /></td>
                            <td className="py-1.5 px-2"><input type="number" step="any" value={fila.denominador} onChange={set('denominador')} className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right" /></td>
                            <td className="py-1.5 px-2"><input type="number" step="any" value={fila.resultado_esperado} onChange={set('resultado_esperado')} className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right" /></td>
                            <td colSpan={2}></td>
                            <td className="py-1.5 px-2 text-right">
                                <button onClick={agregar} disabled={!fila.mes || guardando} className="text-[#1f7a47] hover:bg-[#d1fadf] rounded p-1 disabled:opacity-30" title="Agregar / actualizar mes">
                                    <span className="material-symbols-outlined text-base">add</span>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ── tarjeta de indicador ──────────────────────────────────────────────────────

function IndicadorCard({ indicador, onEditar, onEliminar, onGuardarMedicion, onEliminarMedicion }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="font-semibold text-[#1e3654]">{indicador.nombre}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                        {indicador.tipo && <span className="px-2 py-0.5 rounded-full bg-[#f2f4f7]">{indicador.tipo}</span>}
                        <span className="px-2 py-0.5 rounded-full bg-[#f2f4f7]">{indicador.sentido}</span>
                        {indicador.unidad && <span>Unidad: {indicador.unidad}</span>}
                        {indicador.meta_final != null && <span>Meta: <strong>{indicador.meta_final}</strong></span>}
                        {indicador.linea_base != null && <span>Línea base: {indicador.linea_base}</span>}
                    </div>
                    {indicador.formula && <p className="text-xs text-gray-400 mt-1 font-mono">{indicador.formula}</p>}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => onEditar(indicador)} className="p-1 rounded text-gray-400 hover:text-[#1e3654] hover:bg-gray-100" title="Editar"><span className="material-symbols-outlined text-base">edit</span></button>
                    <button onClick={() => onEliminar(indicador)} className="p-1 rounded text-gray-400 hover:text-[#9c1d1d] hover:bg-[#ffe8e8]" title="Eliminar"><span className="material-symbols-outlined text-base">delete</span></button>
                </div>
            </div>
            <TablaMediciones indicador={indicador} onGuardarMedicion={onGuardarMedicion} onEliminarMedicion={onEliminarMedicion} />
        </div>
    )
}

function SinIndicadores({ onCrear }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center space-y-4">
            <span className="material-symbols-outlined text-5xl text-gray-300">insights</span>
            <div>
                <p className="font-semibold text-[#1e3654]">Este proceso aún no tiene indicadores</p>
                <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                    Define uno o más indicadores (Anexo 4). Sus mediciones mensuales alimentan el
                    semáforo, el avance y las predicciones del dashboard.
                </p>
            </div>
            <button onClick={onCrear} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56]">
                <span className="material-symbols-outlined text-base">add</span> Nuevo indicador
            </button>
        </div>
    )
}

// ── página ────────────────────────────────────────────────────────────────────

export default function IndicadoresPage() {
    const { codigo } = useParams()
    const navigate = useNavigate()
    const { refrescar } = useDatos()
    const [indicadores, setIndicadores] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [modal, setModal] = useState({ open: false, mode: 'crear', indicador: null })

    async function cargar() {
        try {
            const data = await obtenerIndicadores(codigo)
            setIndicadores(data)
            setError(null)
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        let isMounted = true
        async function inicial() {
            try {
                const data = await obtenerIndicadores(codigo)
                if (isMounted) { setIndicadores(data); setError(null) }
            } catch (err) {
                if (isMounted) setError(getErrorMessage(err))
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }
        inicial()
        return () => { isMounted = false }
    }, [codigo])

    async function handleGuardarIndicador(datos, id) {
        await guardarIndicador(codigo, datos, id)
        setModal({ open: false, mode: 'crear', indicador: null })
        await cargar()
        refrescar()
    }

    async function handleEliminarIndicador(ind) {
        if (!window.confirm(`¿Eliminar el indicador "${ind.nombre}"?`)) return
        try {
            await borrarIndicador(ind.id)
            await cargar()
            refrescar()
        } catch (err) { alert(getErrorMessage(err)) }
    }

    async function handleGuardarMedicion(indicadorId, datos) {
        await capturarMedicion(indicadorId, datos)
        await cargar()
        refrescar()
    }

    async function handleEliminarMedicion(id) {
        await borrarMedicion(id)
        await cargar()
        refrescar()
    }

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>Cargando indicadores…
        </div>
    )

    if (error && !indicadores) return (
        <div className="flex items-center gap-2 p-6 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl">
            <span className="material-symbols-outlined">error</span>{error}
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <button onClick={() => navigate('/inventario')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#1e3654] mb-1">
                        <span className="material-symbols-outlined text-sm">arrow_back</span> Inventario
                    </button>
                    <h1 className="text-2xl font-bold text-[#1e3654]">Indicadores · <span className="font-mono">{codigo}</span></h1>
                    <p className="text-sm text-gray-500 mt-1">Anexo 4 · Fichas de indicadores y mediciones mensuales</p>
                </div>
                {indicadores?.length > 0 && (
                    <button onClick={() => setModal({ open: true, mode: 'crear', indicador: null })} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56]">
                        <span className="material-symbols-outlined text-base">add</span> Nuevo indicador
                    </button>
                )}
            </div>

            {!indicadores?.length ? (
                <SinIndicadores onCrear={() => setModal({ open: true, mode: 'crear', indicador: null })} />
            ) : (
                <div className="space-y-4">
                    {indicadores.map((ind) => (
                        <IndicadorCard
                            key={ind.id}
                            indicador={ind}
                            onEditar={(i) => setModal({ open: true, mode: 'editar', indicador: i })}
                            onEliminar={handleEliminarIndicador}
                            onGuardarMedicion={handleGuardarMedicion}
                            onEliminarMedicion={handleEliminarMedicion}
                        />
                    ))}
                </div>
            )}

            {modal.open && (
                <FormularioIndicador
                    estado={modal}
                    onGuardar={handleGuardarIndicador}
                    onCerrar={() => setModal({ open: false, mode: 'crear', indicador: null })}
                />
            )}
        </div>
    )
}

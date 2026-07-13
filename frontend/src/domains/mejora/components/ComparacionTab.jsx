import { useState, useEffect } from 'react'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'

import SemaforoBadge from '../../../shared/components/SemaforoBadge'
import { obtenerComparacion, guardarProyeccion, sugerirProyeccion, getErrorMessage } from '../services/mejoraService'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const INP = 'w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3654]/20'

function serieCombinada(real, proyeccion) {
    const data = real.map((r, i) => ({ mes: r.mes, real: r.valor, proyeccion: i === real.length - 1 ? r.valor : null }))
    proyeccion.forEach((p) => data.push({ mes: p.mes, real: null, proyeccion: p.valor }))
    return data
}

function TarjetaMejora({ mejora, unidad }) {
    if (!mejora) return (
        <p className="text-sm text-gray-400">Agrega una proyección para ver la mejora lograble.</p>
    )
    const u = unidad || '%'
    const signo = mejora.mejora_pp >= 0 ? '+' : ''
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#f2f4f7] rounded-lg p-3">
                <p className="text-[10px] uppercase text-gray-400">Antes → Después</p>
                <p className="font-bold text-[#1e3654]">{mejora.valor_antes} → {mejora.valor_despues} {u}</p>
            </div>
            <div className="bg-[#f2f4f7] rounded-lg p-3">
                <p className="text-[10px] uppercase text-gray-400">Mejora de avance</p>
                <p className={`font-bold ${mejora.mejora_pp >= 0 ? 'text-[#1f7a47]' : 'text-[#9c1d1d]'}`}>{signo}{mejora.mejora_pp} pp</p>
            </div>
            <div className="bg-[#f2f4f7] rounded-lg p-3">
                <p className="text-[10px] uppercase text-gray-400">Semáforo</p>
                <p className="flex items-center gap-1 text-sm"><SemaforoBadge semaforo={mejora.semaforo_antes} /> → <SemaforoBadge semaforo={mejora.semaforo_despues} /></p>
            </div>
            <div className="bg-[#f2f4f7] rounded-lg p-3">
                <p className="text-[10px] uppercase text-gray-400">Alcanza la meta</p>
                <p className="font-bold text-[#1e3654]">{mejora.mes_alcanza_meta ?? '—'}</p>
            </div>
        </div>
    )
}

function EditorProyeccion({ indicador, onGuardar, onSugerir }) {
    const [meses, setMeses] = useState(indicador.proyeccion.map((p) => ({ mes: p.mes, anio: p.anio, valor: p.valor })))
    const [nuevo, setNuevo] = useState({ mes: '', valor: '' })
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState(null)

    const setValor = (i, v) => setMeses((m) => m.map((x, j) => (j === i ? { ...x, valor: v } : x)))
    const quitar = (i) => setMeses((m) => m.filter((_, j) => j !== i))

    function agregarMes() {
        if (!nuevo.mes || nuevo.valor === '') return
        setMeses((m) => [...m, { mes: nuevo.mes, valor: Number(nuevo.valor) }])
        setNuevo({ mes: '', valor: '' })
    }

    async function sugerir() {
        setError(null)
        try {
            const data = await onSugerir(indicador.id)
            setMeses(data.meses.map((m) => ({ mes: m.mes, anio: m.anio, valor: m.valor })))
        } catch (err) { setError(getErrorMessage(err)) }
    }

    async function guardar() {
        setGuardando(true); setError(null)
        try {
            await onGuardar(indicador.id, { meses: meses.map((m) => ({ mes: m.mes, anio: m.anio ?? null, valor: Number(m.valor) })) })
        } catch (err) { setError(getErrorMessage(err)) }
        finally { setGuardando(false) }
    }

    return (
        <div className="border-t border-gray-100 pt-3 space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase">Proyección tras la mejora</p>
                <button onClick={sugerir} className="flex items-center gap-1 text-xs font-medium text-[#0075ca] hover:underline">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span> Sugerir hacia la meta
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {meses.map((m, i) => (
                    <div key={i} className="flex items-center gap-1 bg-[#f8fafc] rounded-lg px-2 py-1">
                        <span className="text-xs text-gray-500 w-16">{m.mes}</span>
                        <input value={m.valor} onChange={(e) => setValor(i, e.target.value)} type="number" step="any" className="w-16 px-1 py-0.5 border border-gray-200 rounded text-xs text-right" />
                        <button onClick={() => quitar(i)} className="text-gray-300 hover:text-[#9c1d1d]"><span className="material-symbols-outlined text-sm">close</span></button>
                    </div>
                ))}
            </div>
            <div className="flex items-end gap-2">
                <select value={nuevo.mes} onChange={(e) => setNuevo((n) => ({ ...n, mes: e.target.value }))} className={`${INP} w-36`}>
                    <option value="">Mes…</option>
                    {MESES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <input value={nuevo.valor} onChange={(e) => setNuevo((n) => ({ ...n, valor: e.target.value }))} type="number" step="any" placeholder="Valor" className={`${INP} w-24`} />
                <button onClick={agregarMes} className="px-2 py-1.5 rounded bg-gray-100 text-[#1e3654] hover:bg-gray-200"><span className="material-symbols-outlined text-base">add</span></button>
                <button onClick={guardar} disabled={guardando} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56] disabled:opacity-50 ml-auto">
                    {guardando && <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>}
                    Guardar proyección
                </button>
            </div>
            {error && <p className="text-sm text-[#9c1d1d]">{error}</p>}
        </div>
    )
}

function IndicadorComparacion({ indicador, onGuardar, onSugerir }) {
    const data = serieCombinada(indicador.real, indicador.proyeccion)
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div>
                <h3 className="font-semibold text-[#1e3654]">{indicador.nombre}</h3>
                <p className="text-xs text-gray-400">Meta: {indicador.meta_final ?? '—'} {indicador.unidad} · {indicador.es_descendente ? 'descendente' : 'ascendente'}</p>
            </div>

            {indicador.real.length === 0 ? (
                <p className="text-sm text-gray-400">Este indicador aún no tiene mediciones reales para comparar.</p>
            ) : (
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={data} margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        {indicador.meta_final != null && (
                            <ReferenceLine y={indicador.meta_final} stroke="#f4d100" strokeDasharray="4 2" label={{ value: 'Meta', position: 'insideTopRight', fontSize: 10, fill: '#854d0e' }} />
                        )}
                        <Line type="monotone" dataKey="real" name="Diagnóstico (real)" stroke="#1e3654" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                        <Line type="monotone" dataKey="proyeccion" name="Proyección (mejora)" stroke="#1f7a47" strokeWidth={2.5} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            )}

            <TarjetaMejora mejora={indicador.mejora} unidad={indicador.unidad} />
            <EditorProyeccion indicador={indicador} onGuardar={onGuardar} onSugerir={onSugerir} />
        </div>
    )
}

export default function ComparacionTab({ codigo }) {
    const [datos, setDatos] = useState(null)
    const [error, setError] = useState(null)

    async function cargar() {
        try { setDatos(await obtenerComparacion(codigo)); setError(null) }
        catch (err) { setError(getErrorMessage(err)) }
    }

    useEffect(() => {
        let m = true
        obtenerComparacion(codigo).then((d) => m && setDatos(d)).catch((e) => m && setError(getErrorMessage(e)))
        return () => { m = false }
    }, [codigo])

    async function handleGuardar(indicadorId, payload) { await guardarProyeccion(indicadorId, payload); await cargar() }

    if (error) return <div className="flex items-center gap-2 p-4 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl text-sm"><span className="material-symbols-outlined">error</span>{error}</div>
    if (!datos) return <p className="text-gray-400 text-sm">Cargando…</p>

    return (
        <div className="space-y-5">
            <p className="text-sm text-gray-500">
                Compara el desempeño <strong>real (diagnóstico)</strong> con la <strong>proyección tras aplicar la mejora</strong>.
                Puedes escribir la proyección mes a mes o sugerirla automáticamente hacia la meta.
            </p>
            {datos.indicadores.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Este proceso no tiene indicadores. Créalos en el Anexo 4 para proyectar la mejora.</p>
            ) : (
                datos.indicadores.map((ind) => (
                    <IndicadorComparacion key={ind.id} indicador={ind} onGuardar={handleGuardar} onSugerir={sugerirProyeccion} />
                ))
            )}
        </div>
    )
}

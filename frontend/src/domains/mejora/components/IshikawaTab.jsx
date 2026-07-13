import { useState, useEffect } from 'react'
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell, ResponsiveContainer,
} from 'recharts'

import { obtenerCausas, guardarCausa, borrarCausa, getErrorMessage } from '../services/mejoraService'

const ICONO_6M = {
    'Método': 'account_tree', 'Personas': 'group', 'Entorno': 'public',
    'Medición': 'straighten', 'Máquina-TI': 'memory', 'Materiales': 'inventory_2',
}
const DESC_6M = {
    'Método': 'Forma de trabajar: procedimientos, políticas, flujos y reglas del proceso.',
    'Personas': 'Equipo humano: competencias, capacitación, carga de trabajo y comunicación.',
    'Entorno': 'Condiciones externas: normativa, cultura organizacional y espacio de trabajo.',
    'Medición': 'Datos e indicadores: qué se mide, cómo se mide y calidad de la información.',
    'Máquina-TI': 'Tecnología: equipos, sistemas y herramientas que dan soporte al proceso.',
    'Materiales': 'Insumos y recursos: documentos, formatos y materiales necesarios para ejecutar.',
}
const INP = 'w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3654]/20'

function ParetoCausas({ pareto }) {
    if (!pareto.items.length) return null
    const data = pareto.items.map((it) => ({ ...it, etiqueta: it.descripcion.length > 18 ? it.descripcion.slice(0, 17) + '…' : it.descripcion }))
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-[#1e3654] mb-1">Pareto de causas (regla 80/20)</h3>
            <p className="text-xs text-gray-400 mb-4">Las barras azules concentran ~80% del problema: ataca esas primero.</p>
            <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data} margin={{ top: 4, right: 36, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={50} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v, n) => [n === '% acumulado' ? `${v}%` : v, n]} />
                    <ReferenceLine yAxisId="right" y={80} stroke="#9c1d1d" strokeDasharray="4 2" />
                    <Bar yAxisId="left" dataKey="peso" name="Peso" radius={[4, 4, 0, 0]}>
                        {data.map((it, i) => <Cell key={it.id} fill={i <= pareto.umbral_80 ? '#1e3654' : '#cbd5e1'} />)}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="porcentaje_acumulado" name="% acumulado" stroke="#f4d100" strokeWidth={2.5} dot={{ r: 3, fill: '#f4d100' }} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    )
}

function CategoriaCard({ categoria, causas, onAgregar, onToggleRaiz, onEliminar }) {
    const [desc, setDesc] = useState('')
    const [peso, setPeso] = useState('')

    async function agregar() {
        if (!desc.trim()) return
        await onAgregar({ categoria, descripcion: desc, peso: peso === '' ? 1 : Number(peso) })
        setDesc(''); setPeso('')
    }

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h4 className="flex items-center gap-1.5 text-sm font-bold text-[#1e3654]">
                <span className="material-symbols-outlined text-base text-gray-400">{ICONO_6M[categoria]}</span>
                {categoria}
            </h4>
            <p className="text-xs text-gray-400 mb-2 mt-0.5">{DESC_6M[categoria]}</p>
            <ul className="space-y-1 mb-2 min-h-[24px]">
                {causas.map((c) => (
                    <li key={c.id} className="flex items-center gap-1 text-sm text-gray-700 group">
                        <button onClick={() => onToggleRaiz(c)} title={c.es_raiz ? 'Causa raíz' : 'Marcar como causa raíz'}>
                            <span className={`material-symbols-outlined text-base ${c.es_raiz ? 'text-[#f4d100]' : 'text-gray-300 hover:text-gray-400'}`}>
                                {c.es_raiz ? 'star' : 'star_border'}
                            </span>
                        </button>
                        <span className="flex-1">{c.descripcion}</span>
                        <span className="text-xs text-gray-400" title="Peso (frecuencia o impacto)">{c.peso}</span>
                        <button onClick={() => onEliminar(c)} title="Eliminar causa" className="text-gray-300 hover:text-[#9c1d1d]">
                            <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                    </li>
                ))}
            </ul>
            <div className="flex gap-1">
                <input value={desc} onChange={(e) => setDesc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && agregar()} placeholder="Nueva causa…" className={INP} />
                <input value={peso} onChange={(e) => setPeso(e.target.value)} type="number" step="any" placeholder="Peso" className="w-16 px-2 py-1.5 border border-gray-200 rounded text-sm" title="Frecuencia o impacto para el Pareto" />
                <button onClick={agregar} className="px-2 rounded bg-[#1e3654] text-white hover:bg-[#0c2f56]"><span className="material-symbols-outlined text-base">add</span></button>
            </div>
        </div>
    )
}

export default function IshikawaTab({ codigo }) {
    const [datos, setDatos] = useState(null)
    const [error, setError] = useState(null)

    async function cargar() {
        try { setDatos(await obtenerCausas(codigo)); setError(null) }
        catch (err) { setError(getErrorMessage(err)) }
    }

    useEffect(() => {
        let m = true
        obtenerCausas(codigo).then((d) => m && setDatos(d)).catch((e) => m && setError(getErrorMessage(e)))
        return () => { m = false }
    }, [codigo])

    async function agregar(datosCausa) { await guardarCausa(codigo, datosCausa); await cargar() }
    async function toggleRaiz(c) { await guardarCausa(codigo, { es_raiz: !c.es_raiz }, c.id); await cargar() }
    async function eliminar(c) {
        if (!window.confirm(`¿Eliminar la causa "${c.descripcion}"?`)) return
        await borrarCausa(c.id); await cargar()
    }

    if (error) return <div className="flex items-center gap-2 p-4 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl text-sm"><span className="material-symbols-outlined">error</span>{error}</div>
    if (!datos) return <p className="text-gray-400 text-sm">Cargando…</p>

    const totalCausas = datos.categorias.reduce((s, c) => s + datos.ishikawa[c].length, 0)

    return (
        <div className="space-y-5">
            <p className="text-sm text-gray-500">
                Registra las causas del bajo desempeño por las <strong>6M</strong> y marca con ⭐ las <strong>causas raíz</strong>.
                El Pareto te muestra las pocas causas que generan la mayor parte del problema.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {datos.categorias.map((cat) => (
                    <CategoriaCard key={cat} categoria={cat} causas={datos.ishikawa[cat]} onAgregar={agregar} onToggleRaiz={toggleRaiz} onEliminar={eliminar} />
                ))}
            </div>
            {totalCausas > 0 ? <ParetoCausas pareto={datos.pareto} /> : (
                <p className="text-sm text-gray-400 text-center py-4">Agrega causas para ver el Pareto.</p>
            )}
        </div>
    )
}

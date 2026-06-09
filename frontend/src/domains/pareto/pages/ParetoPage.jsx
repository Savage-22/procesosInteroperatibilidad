import { useState, useEffect } from 'react'
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { getParetoData, getParetoErrorMessage } from '../services/paretoService'

const SEMAFORO_COLOR = { Verde: '#1f7a47', Amarillo: '#f4d100', Rojo: '#9c1d1d' }
const SEMAFORO_BADGE = {
    Verde: 'bg-[#dcf8e8] text-[#1f7a47]',
    Amarillo: 'bg-[#fef9c3] text-[#854d0e]',
    Rojo: 'bg-[#ffe8e8] text-[#9c1d1d]',
    'Sin datos': 'bg-gray-100 text-gray-500',
}

function SemaforoBadge({ semaforo }) {
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SEMAFORO_BADGE[semaforo] ?? SEMAFORO_BADGE['Sin datos']}`}>
            {semaforo}
        </span>
    )
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-md p-3 text-xs">
            <p className="font-semibold text-[#1e3654] mb-1">{label}</p>
            {payload.map((entry) => (
                <p key={entry.name} style={{ color: entry.color }}>
                    {entry.name}: {entry.value?.toFixed(2)}{entry.name.includes('%') ? '%' : ' pp'}
                </p>
            ))}
        </div>
    )
}

export default function ParetoPage() {
    const [datos, setDatos] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let isMounted = true

        async function cargar() {
            try {
                const data = await getParetoData()
                if (isMounted) setDatos(data)
            } catch (err) {
                if (isMounted) setError(getParetoErrorMessage(err))
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }

        cargar()
        return () => { isMounted = false }
    }, [])

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Cargando análisis Pareto…
        </div>
    )

    if (error) return (
        <div className="flex items-center gap-2 p-6 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl">
            <span className="material-symbols-outlined">error</span>
            {error}
        </div>
    )

    const { items, umbral_80 } = datos
    const itemsCriticos = items.slice(0, umbral_80 + 1)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#1e3654]">Análisis Pareto</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Identificación del 20% de procesos que concentran el 80% de la brecha total
                </p>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Procesos críticos (80%)</p>
                    <p className="text-2xl font-bold text-[#9c1d1d]">{umbral_80 + 1} de {items.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Mayor brecha</p>
                    <p className="text-2xl font-bold text-[#1e3654]">{items[0]?.brecha_pareto?.toFixed(1)} pp</p>
                    <p className="text-xs text-gray-400">{items[0]?.codigo}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Brecha total</p>
                    <p className="text-2xl font-bold text-[#1e3654]">
                        {items.reduce((acc, i) => acc + (i.brecha_pareto ?? 0), 0).toFixed(1)} pp
                    </p>
                </div>
            </div>

            {/* Gráfico Pareto */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <h2 className="text-sm font-semibold text-[#1e3654] mb-4">
                    Diagrama Pareto — brecha por proceso y % acumulado
                </h2>
                <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={items} margin={{ top: 4, right: 40, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="codigo" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <ReferenceLine yAxisId="right" y={80} stroke="#9c1d1d" strokeDasharray="4 2"
                            label={{ value: '80%', position: 'insideTopRight', fontSize: 10, fill: '#9c1d1d' }} />
                        <Bar yAxisId="left" dataKey="brecha_pareto" name="Brecha (pp)" radius={[4, 4, 0, 0]}>
                            {items.map((item, i) => (
                                <Cell
                                    key={item.codigo}
                                    fill={i <= umbral_80 ? '#1e3654' : '#cbd5e1'}
                                />
                            ))}
                        </Bar>
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="porcentaje_acumulado"
                            name="% acumulado"
                            stroke="#f4d100"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: '#f4d100' }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Tabla ranking */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-[#1e3654]">Ranking de criticidad</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#f2f4f7] text-gray-600 text-xs uppercase tracking-wide">
                            <tr>
                                {['#', 'Código', 'Proceso', 'Módulo', 'Brecha (pp)', 'Avance T1', '% Acumulado', 'Semáforo'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items.map((item, i) => (
                                <tr
                                    key={item.codigo}
                                    className={`transition-colors ${i <= umbral_80 ? 'bg-[#f2f4f7]/60' : ''} hover:bg-[#e6eaf0]`}
                                >
                                    <td className="px-4 py-3 font-bold text-gray-400">{i + 1}</td>
                                    <td className="px-4 py-3 font-mono font-semibold text-[#1e3654]">{item.codigo}</td>
                                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{item.proceso}</td>
                                    <td className="px-4 py-3 text-gray-500">{item.modulo}</td>
                                    <td className={`px-4 py-3 font-semibold ${item.brecha_pareto > 0 ? 'text-[#9c1d1d]' : 'text-[#1f7a47]'}`}>
                                        {item.brecha_pareto?.toFixed(1)}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{item.promedio_avance_t1?.toFixed(1)}%</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                                <div
                                                    className="h-1.5 rounded-full bg-[#f4d100]"
                                                    style={{ width: `${Math.min(item.porcentaje_acumulado, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-gray-600">{item.porcentaje_acumulado?.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3"><SemaforoBadge semaforo={item.semaforo} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

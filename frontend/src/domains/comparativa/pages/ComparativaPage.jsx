import { useState, useEffect, useMemo } from 'react'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { getComparativaData, transformarParaGrafico, getComparativaErrorMessage } from '../services/comparativaService'

function ProcesoSelector({ procesos, seleccionados, onToggle, onTodos, onNinguno }) {
    const modulos = [...new Set(procesos.map((p) => p.modulo))].sort()

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <button onClick={onTodos} className="text-xs px-2 py-1 rounded bg-[#1e3654] text-white hover:bg-[#0c2f56] transition-colors">
                    Todos
                </button>
                <button onClick={onNinguno} className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
                    Ninguno
                </button>
            </div>
            {modulos.map((mod) => (
                <div key={mod}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{mod}</p>
                    {procesos
                        .filter((p) => p.modulo === mod)
                        .map((p) => (
                            <label key={p.codigo} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1">
                                <input
                                    type="checkbox"
                                    checked={seleccionados.has(p.codigo)}
                                    onChange={() => onToggle(p.codigo)}
                                    className="rounded"
                                />
                                <span
                                    className="w-3 h-3 rounded-full shrink-0"
                                    style={{ backgroundColor: p.color_hex }}
                                />
                                <span className="text-sm text-gray-700">{p.codigo}</span>
                            </label>
                        ))}
                </div>
            ))}
        </div>
    )
}

export default function ComparativaPage() {
    const [procesos, setProcesos] = useState([])
    const [seleccionados, setSeleccionados] = useState(new Set())
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let isMounted = true

        async function cargar() {
            try {
                const data = await getComparativaData()
                if (isMounted) {
                    setProcesos(data)
                    setSeleccionados(new Set(data.map((p) => p.codigo)))
                }
            } catch (err) {
                if (isMounted) setError(getComparativaErrorMessage(err))
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }

        cargar()
        return () => { isMounted = false }
    }, [])

    const procesosSeleccionados = useMemo(
        () => procesos.filter((p) => seleccionados.has(p.codigo)),
        [procesos, seleccionados],
    )

    const datosGrafico = useMemo(
        () => transformarParaGrafico(procesosSeleccionados),
        [procesosSeleccionados],
    )

    function handleToggle(codigo) {
        setSeleccionados((prev) => {
            const next = new Set(prev)
            next.has(codigo) ? next.delete(codigo) : next.add(codigo)
            return next
        })
    }

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Cargando comparativa…
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
                <h1 className="text-2xl font-bold text-[#1e3654]">Comparativa de Procesos</h1>
                <p className="text-sm text-gray-500 mt-1">Avance T1 (%) por proceso y mes</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Selector */}
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 lg:w-52 shrink-0">
                    <h2 className="text-sm font-semibold text-[#1e3654] mb-3">Procesos</h2>
                    <ProcesoSelector
                        procesos={procesos}
                        seleccionados={seleccionados}
                        onToggle={handleToggle}
                        onTodos={() => setSeleccionados(new Set(procesos.map((p) => p.codigo)))}
                        onNinguno={() => setSeleccionados(new Set())}
                    />
                </div>

                {/* Gráfico */}
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex-1">
                    <h2 className="text-sm font-semibold text-[#1e3654] mb-4">
                        Avance T1 (%) — {procesosSeleccionados.length} proceso{procesosSeleccionados.length !== 1 ? 's' : ''} seleccionado{procesosSeleccionados.length !== 1 ? 's' : ''}
                    </h2>
                    {procesosSeleccionados.length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-gray-400">
                            Selecciona al menos un proceso
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={datosGrafico} margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                                <YAxis domain={[0, 105]} tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(v) => v !== null ? [`${v?.toFixed(1)}%`] : ['Sin datos']} />
                                <Legend />
                                {procesosSeleccionados.map((p) => (
                                    <Line
                                        key={p.codigo}
                                        type="monotone"
                                        dataKey={p.codigo}
                                        name={p.codigo}
                                        stroke={p.color_hex}
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                        connectNulls={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Tabla comparativa */}
            {procesosSeleccionados.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                        <h2 className="text-base font-semibold text-[#1e3654]">Tabla comparativa — Avance T1 (%)</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#f2f4f7] text-gray-600 text-xs uppercase tracking-wide">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium">Mes</th>
                                    {procesosSeleccionados.map((p) => (
                                        <th key={p.codigo} className="px-4 py-3 text-left font-medium">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color_hex }} />
                                                {p.codigo}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {datosGrafico.map((fila) => (
                                    <tr key={fila.mes} className="hover:bg-[#f2f4f7] transition-colors">
                                        <td className="px-4 py-3 font-medium text-[#1e3654]">{fila.mes}</td>
                                        {procesosSeleccionados.map((p) => (
                                            <td key={p.codigo} className="px-4 py-3 text-gray-600">
                                                {fila[p.codigo] !== null && fila[p.codigo] !== undefined
                                                    ? `${fila[p.codigo].toFixed(1)}%`
                                                    : '—'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

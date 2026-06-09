import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { getProcesoDetalle, getProcesoErrorMessage } from '../services/procesosService'

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

export default function ProcesoDetallePage() {
    const { codigo } = useParams()
    const navigate = useNavigate()
    const [proceso, setProceso] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let isMounted = true

        async function cargar() {
            setIsLoading(true)
            setError(null)
            try {
                const data = await getProcesoDetalle(codigo)
                if (isMounted) setProceso(data)
            } catch (err) {
                if (isMounted) setError(getProcesoErrorMessage(err))
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }

        cargar()
        return () => { isMounted = false }
    }, [codigo])

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Cargando proceso…
        </div>
    )

    if (error) return (
        <div className="space-y-4">
            <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-[#1e3654] hover:underline">
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Volver al dashboard
            </button>
            <div className="flex items-center gap-2 p-6 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl">
                <span className="material-symbols-outlined">error</span>
                {error}
            </div>
        </div>
    )

    const { meses } = proceso
    const unidad = proceso.es_descendente ? 'días' : '%'

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-[#1e3654] hover:underline mb-3">
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Volver al dashboard
                </button>
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{proceso.modulo ?? ''}</p>
                            <h1 className="text-xl font-bold text-[#1e3654]">
                                {proceso.codigo} — {proceso.proceso}
                            </h1>
                            {proceso.indicador && (
                                <p className="text-sm text-gray-600 mt-1">{proceso.indicador}</p>
                            )}
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-xs text-gray-500">Meta final</p>
                            <p className="text-2xl font-bold text-[#1e3654]">{proceso.meta_final} {unidad}</p>
                            <p className="text-xs text-gray-400">{proceso.meta_texto}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Resultado obtenido vs esperado */}
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                    <h2 className="text-sm font-semibold text-[#1e3654] mb-4">
                        Resultado obtenido vs esperado ({unidad})
                    </h2>
                    <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={meses} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="resultado_obtenido"
                                name="Obtenido"
                                stroke="#1e3654"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="resultado_esperado"
                                name="Esperado"
                                stroke="#9ca3af"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Avance T1 mensual */}
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                    <h2 className="text-sm font-semibold text-[#1e3654] mb-4">
                        Avance T1 mensual (%)
                    </h2>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={meses} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 105]} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v) => [`${v?.toFixed(1)}%`, 'Avance T1']} />
                            <ReferenceLine y={95} stroke="#1f7a47" strokeDasharray="4 2" label={{ value: '95%', fontSize: 10, fill: '#1f7a47' }} />
                            <ReferenceLine y={75} stroke="#f4d100" strokeDasharray="4 2" label={{ value: '75%', fontSize: 10, fill: '#854d0e' }} />
                            <Bar dataKey="avance_t1" name="Avance T1" radius={[4, 4, 0, 0]}>
                                {meses.map((m, i) => (
                                    <Cell key={i} fill={SEMAFORO_COLOR[m.semaforo] ?? '#6b7280'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Tabla completa */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-[#1e3654]">Datos mensuales</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#f2f4f7] text-gray-600 text-xs uppercase tracking-wide">
                            <tr>
                                {['Mes', 'Numerador', 'Denominador', 'R. Esperado', 'R. Obtenido', 'Diferencia', 'Avance T1', 'Semáforo'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {meses.map((m) => (
                                <tr key={m.mes} className="hover:bg-[#f2f4f7] transition-colors">
                                    <td className="px-4 py-3 font-medium text-[#1e3654]">{m.mes}</td>
                                    <td className="px-4 py-3 text-gray-600">{m.numerador}</td>
                                    <td className="px-4 py-3 text-gray-600">{m.denominador}</td>
                                    <td className="px-4 py-3 text-gray-600">{m.resultado_esperado}</td>
                                    <td className="px-4 py-3 font-medium">{m.resultado_obtenido}</td>
                                    <td className={`px-4 py-3 font-medium ${m.diferencia >= 0 ? 'text-[#1f7a47]' : 'text-[#9c1d1d]'}`}>
                                        {m.diferencia >= 0 ? '+' : ''}{m.diferencia}
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-[#1e3654]">{m.avance_t1?.toFixed(1)}%</td>
                                    <td className="px-4 py-3"><SemaforoBadge semaforo={m.semaforo} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { getDashboardData, getDashboardErrorMessage } from '../services/dashboardService'

const SEMAFORO_COLOR = { Verde: '#1f7a47', Amarillo: '#f4d100', Rojo: '#9c1d1d' }
const SEMAFORO_BADGE = {
    Verde: 'bg-[#dcf8e8] text-[#1f7a47]',
    Amarillo: 'bg-[#fef9c3] text-[#854d0e]',
    Rojo: 'bg-[#ffe8e8] text-[#9c1d1d]',
    'Sin datos': 'bg-gray-100 text-gray-500',
}

function KpiCard({ label, value, icon, iconColor }) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4 border border-gray-100">
            <span className={`material-symbols-outlined text-4xl ${iconColor}`}>{icon}</span>
            <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-[#1e3654]">{value}</p>
            </div>
        </div>
    )
}

function SemaforoBadge({ semaforo }) {
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SEMAFORO_BADGE[semaforo] ?? SEMAFORO_BADGE['Sin datos']}`}>
            {semaforo}
        </span>
    )
}

export default function DashboardPage() {
    const navigate = useNavigate()
    const [datos, setDatos] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let isMounted = true

        async function cargar() {
            try {
                const data = await getDashboardData()
                if (isMounted) setDatos(data)
            } catch (err) {
                if (isMounted) setError(getDashboardErrorMessage(err))
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
            Cargando dashboard…
        </div>
    )

    if (error) return (
        <div className="flex items-center gap-2 p-6 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl">
            <span className="material-symbols-outlined">error</span>
            {error}
        </div>
    )

    const { kpis, procesos } = datos

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#1e3654]">Dashboard de Procesos</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Seguimiento y evaluación — Directiva CEPLAN N° 0056-2024
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Total procesos" value={kpis.total_procesos} icon="schema" iconColor="text-[#1e3654]" />
                <KpiCard label="En verde" value={`${kpis.porcentaje_verde}%`} icon="check_circle" iconColor="text-[#1f7a47]" />
                <KpiCard label="En amarillo" value={`${kpis.porcentaje_amarillo}%`} icon="warning" iconColor="text-[#854d0e]" />
                <KpiCard label="En rojo" value={`${kpis.porcentaje_rojo}%`} icon="cancel" iconColor="text-[#9c1d1d]" />
            </div>

            {/* Proceso más crítico */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex items-center gap-4">
                <span className="material-symbols-outlined text-3xl text-[#9c1d1d]">priority_high</span>
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Proceso más crítico</p>
                    <p className="font-semibold text-[#1e3654]">
                        {kpis.proceso_mas_critico.codigo} — {kpis.proceso_mas_critico.proceso}
                    </p>
                    <p className="text-sm text-gray-500">
                        Avance T1 promedio: <strong>{kpis.proceso_mas_critico.promedio_avance_t1?.toFixed(1)}%</strong>
                        {' '}<SemaforoBadge semaforo={kpis.proceso_mas_critico.semaforo} />
                    </p>
                </div>
            </div>

            {/* Gráfico semáforo por proceso */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <h2 className="text-base font-semibold text-[#1e3654] mb-4">
                    Distribución de semáforo por proceso (meses)
                </h2>
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={kpis.distribucion_semaforo} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="codigo" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="verde" name="Verde" stackId="a" fill={SEMAFORO_COLOR.Verde} />
                        <Bar dataKey="amarillo" name="Amarillo" stackId="a" fill={SEMAFORO_COLOR.Amarillo} />
                        <Bar dataKey="rojo" name="Rojo" stackId="a" fill={SEMAFORO_COLOR.Rojo} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Tabla resumen */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-[#1e3654]">Resumen de procesos</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#f2f4f7] text-gray-600 text-xs uppercase tracking-wide">
                            <tr>
                                {['Código', 'Proceso', 'Módulo', 'Meta final', 'Prom. Obtenido', 'Avance T1', 'Brecha', 'Semáforo'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {procesos.map((p) => (
                                <tr
                                    key={p.codigo}
                                    onClick={() => navigate(`/proceso/${p.codigo}`)}
                                    className="hover:bg-[#f2f4f7] cursor-pointer transition-colors"
                                >
                                    <td className="px-4 py-3 font-mono font-semibold text-[#1e3654]">{p.codigo}</td>
                                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{p.proceso}</td>
                                    <td className="px-4 py-3 text-gray-500">{p.modulo}</td>
                                    <td className="px-4 py-3 text-gray-600">{p.meta_final}{p.es_descendente ? ' días' : '%'}</td>
                                    <td className="px-4 py-3 text-gray-600">{p.promedio_resultado_obtenido?.toFixed(1)}</td>
                                    <td className="px-4 py-3 font-medium text-[#1e3654]">{p.promedio_avance_t1?.toFixed(1)}%</td>
                                    <td className="px-4 py-3 text-gray-600">{p.brecha?.toFixed(1)}</td>
                                    <td className="px-4 py-3"><SemaforoBadge semaforo={p.semaforo} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import SemaforoBadge from '../../../shared/components/SemaforoBadge'
import { useDatos } from '../../../shared/hooks/useDatos'
import KpiCard from '../components/KpiCard'
import SemaforoBarChart from '../components/SemaforoBarChart'
import ProcesoTable from '../components/ProcesoTable'
import { getDashboardData, getDashboardErrorMessage } from '../services/dashboardService'

export default function DashboardPage() {
    const navigate = useNavigate()
    const { version } = useDatos()
    const [datos, setDatos] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let isMounted = true

        async function cargar() {
            try {
                const data = await getDashboardData()
                if (isMounted) {
                    setDatos(data)
                    setError(null)
                }
            } catch (err) {
                if (isMounted) setError(getDashboardErrorMessage(err))
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

    if (procesos.length === 0) return (
        <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-500">
            <span className="material-symbols-outlined text-4xl">database_off</span>
            <p>No hay datos cargados. Verifica el archivo Excel del servidor.</p>
        </div>
    )

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
                <KpiCard label="Total procesos" value={kpis.total_procesos} icon="schema" color="neutro" />
                <KpiCard label="En verde" value={`${kpis.porcentaje_verde}%`} icon="check_circle" color="verde" />
                <KpiCard label="En amarillo" value={`${kpis.porcentaje_amarillo}%`} icon="warning" color="amarillo" />
                <KpiCard label="En rojo" value={`${kpis.porcentaje_rojo}%`} icon="cancel" color="rojo" />
            </div>

            {/* Proceso más crítico */}
            {kpis.proceso_mas_critico && (
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
            )}

            {/* Gráfico semáforo por proceso */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <h2 className="text-base font-semibold text-[#1e3654] mb-4">
                    Distribución de semáforo por proceso (meses)
                </h2>
                <SemaforoBarChart data={kpis.distribucion_semaforo} />
            </div>

            {/* Tabla resumen */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-[#1e3654]">Resumen de procesos</h2>
                </div>
                <ProcesoTable procesos={procesos} onRowClick={(codigo) => navigate(`/proceso/${codigo}`)} />
            </div>
        </div>
    )
}

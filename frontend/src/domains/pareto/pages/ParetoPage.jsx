import { useState, useEffect } from 'react'

import PanelAnalisisIA from '../../../shared/components/PanelAnalisisIA'
import SemaforoBadge from '../../../shared/components/SemaforoBadge'
import { useDatos } from '../../../shared/hooks/useDatos'
import ParetoChart from '../components/ParetoChart'
import { getParetoData, getParetoErrorMessage } from '../services/paretoService'

export default function ParetoPage() {
    const { version } = useDatos()
    const [datos, setDatos] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let isMounted = true

        async function cargar() {
            try {
                const data = await getParetoData()
                if (isMounted) {
                    setDatos(data)
                    setError(null)
                }
            } catch (err) {
                if (isMounted) setError(getParetoErrorMessage(err))
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

    if (items.length === 0) return (
        <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-500">
            <span className="material-symbols-outlined text-4xl">database_off</span>
            <p>No hay datos cargados. Verifica el archivo Excel del servidor.</p>
        </div>
    )

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#1e3654]">Análisis Pareto</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Procesos que concentran el 80% de la brecha de avance T1 (puntos que faltan para el 100%)
                </p>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Procesos críticos (80%)</p>
                    <p className="text-2xl font-bold text-[#9c1d1d]">{umbral_80 + 1} de {items.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Mayor brecha de avance</p>
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
                <ParetoChart items={items} umbral80={umbral_80} />
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
                                {['#', 'Código', 'Proceso', 'Módulo', 'Brecha avance (pp)', 'Avance T1', '% Acumulado', 'Semáforo'].map((h) => (
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

            <PanelAnalisisIA
                seccion="pareto"
                titulo="Análisis del Pareto"
                descripcion="La IA interpreta el grupo crítico y sugiere dónde concentrar los recursos."
            />
        </div>
    )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import SemaforoBadge from '../../../shared/components/SemaforoBadge'
import RelevanciaBadge from '../../../shared/components/RelevanciaBadge'
import MejoraBadge from '../../../shared/components/MejoraBadge'
import { useDatos } from '../../../shared/hooks/useDatos'
import ResultadoLineChart from '../components/ResultadoLineChart'
import T1BarChart from '../components/T1BarChart'
import { getProcesoDetalle, getProcesoErrorMessage } from '../services/procesosService'

export default function ProcesoDetallePage() {
    const { codigo } = useParams()
    const navigate = useNavigate()
    const { version } = useDatos()
    const [proceso, setProceso] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let isMounted = true

        async function cargar() {
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
    }, [codigo, version])

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
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <RelevanciaBadge relevancia={proceso.relevancia} ponderador={proceso.ponderador} />
                                <MejoraBadge mejora={proceso.mejora} unidad={unidad} />
                            </div>
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
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                    <h2 className="text-sm font-semibold text-[#1e3654] mb-4">
                        Resultado obtenido vs esperado ({unidad})
                    </h2>
                    <ResultadoLineChart meses={meses} />
                </div>

                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                    <h2 className="text-sm font-semibold text-[#1e3654] mb-4">
                        Avance T1 mensual (%)
                    </h2>
                    <T1BarChart meses={meses} />
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

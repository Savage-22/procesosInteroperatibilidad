import { useState, useEffect, useMemo, useCallback } from 'react'

import InformeIA from '../../../shared/components/InformeIA'
import { obtenerInformeComparativa } from '../../../shared/services/analisisService'
import { useDatos } from '../../../shared/hooks/useDatos'
import ProcesoSelector from '../components/ProcesoSelector'
import ComparativeLineChart from '../components/ComparativeLineChart'
import { getComparativaData, transformarParaGrafico, getComparativaErrorMessage } from '../services/comparativaService'

export default function ComparativaPage() {
    const { version } = useDatos()
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
                    setError(null)
                    // Solo en la primera carga se seleccionan todos; en recargas se respeta la selección
                    setSeleccionados((prev) =>
                        prev.size === 0 ? new Set(data.map((p) => p.codigo)) : prev,
                    )
                }
            } catch (err) {
                if (isMounted) setError(getComparativaErrorMessage(err))
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }

        cargar()
        return () => { isMounted = false }
    }, [version])

    const procesosSeleccionados = useMemo(
        () => procesos.filter((p) => seleccionados.has(p.codigo)),
        [procesos, seleccionados],
    )

    const datosGrafico = useMemo(
        () => transformarParaGrafico(procesosSeleccionados),
        [procesosSeleccionados],
    )

    // El informe se archiva por el conjunto comparado, así que el alcance debe
    // ser estable ante el orden en que el usuario marcó las casillas.
    const codigosSeleccionados = useMemo(
        () => procesosSeleccionados.map((p) => p.codigo).sort(),
        [procesosSeleccionados],
    )

    const generarInforme = useCallback(
        () => obtenerInformeComparativa(codigosSeleccionados),
        [codigosSeleccionados],
    )

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
                        onSelectionChange={(codigos) => setSeleccionados(new Set(codigos))}
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
                        <ComparativeLineChart procesos={procesosSeleccionados} datos={datosGrafico} />
                    )}
                </div>
            </div>

            {/* Informe comparativo redactado por la IA sobre los procesos elegidos */}
            <InformeIA
                tipo="comparativa"
                alcance={codigosSeleccionados.join(',')}
                onGenerar={generarInforme}
                icono="compare_arrows"
                titulo="Informe comparativo"
                descripcion={
                    codigosSeleccionados.length >= 2
                        ? `Qué diferencia a ${codigosSeleccionados.join(', ')}: quién lidera, quién se rezaga y qué replicar.`
                        : 'Explica en qué se diferencian los procesos comparados y qué conviene replicar.'
                }
                deshabilitado={codigosSeleccionados.length < 2}
                motivoDeshabilitado="Selecciona al menos 2 procesos para compararlos en un informe."
            />

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

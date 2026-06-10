import { useState, useEffect, useMemo } from 'react'

import { useDatos } from '../../../shared/hooks/useDatos'
import KpiCard from '../../dashboard/components/KpiCard'
import EstadoMetaBadge from '../components/EstadoMetaBadge'
import PrediccionLineChart from '../components/PrediccionLineChart'
import {
    getPrediccionesData,
    getPrediccionesErrorMessage,
    construirSerie,
    clasificarPorEstado,
    iconoTendencia,
    confiabilidad,
} from '../services/prediccionesService'

export default function PrediccionesPage() {
    const { version } = useDatos()
    const [procesos, setProcesos] = useState(null)
    const [seleccionado, setSeleccionado] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let isMounted = true

        async function cargar() {
            try {
                const data = await getPrediccionesData()
                if (!isMounted) return
                setProcesos(data)
                setError(null)
                // Por defecto enfoca el primer proceso en riesgo; si no hay,
                // el primero con proyección disponible
                const riesgo = data.find((p) => p.prediccion && !p.prediccion.alcanzara_meta)
                const conDatos = data.find((p) => p.prediccion)
                setSeleccionado((riesgo ?? conDatos ?? data[0])?.codigo ?? null)
            } catch (err) {
                if (isMounted) setError(getPrediccionesErrorMessage(err))
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }

        cargar()
        return () => { isMounted = false }
    }, [version])

    const { enCamino, enRiesgo, sinDatos } = useMemo(
        () => clasificarPorEstado(procesos ?? []),
        [procesos],
    )

    const proceso = useMemo(
        () => procesos?.find((p) => p.codigo === seleccionado) ?? null,
        [procesos, seleccionado],
    )

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Calculando proyecciones…
        </div>
    )

    if (error) return (
        <div className="flex items-center gap-2 p-6 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl">
            <span className="material-symbols-outlined">error</span>
            {error}
        </div>
    )

    const conProyeccion = procesos.filter((p) => p.prediccion)

    if (conProyeccion.length === 0) return (
        <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-500 text-center">
            <span className="material-symbols-outlined text-4xl">timeline</span>
            <p>No hay suficientes meses cargados para proyectar tendencias.<br />Se necesitan al menos 2 meses por proceso.</p>
        </div>
    )

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#1e3654]">Predicciones de tendencia</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Proyección del resultado de cada proceso hasta diciembre mediante regresión lineal
                    sobre los meses reportados. Indica si la tendencia actual alcanza la meta anual.
                </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard label="En camino a la meta" value={`${enCamino.length} de ${procesos.length}`} color="verde" icon="trending_up" />
                <KpiCard label="En riesgo" value={`${enRiesgo.length} de ${procesos.length}`} color="rojo" icon="warning" />
                <KpiCard label="Sin proyección" value={`${sinDatos.length} de ${procesos.length}`} color="neutro" icon="help" />
            </div>

            {/* Detalle del proceso seleccionado */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                    <div>
                        <h2 className="text-base font-semibold text-[#1e3654]">Proyección por proceso</h2>
                        {proceso && (
                            <p className="text-sm text-gray-500">{proceso.codigo} — {proceso.proceso}</p>
                        )}
                    </div>
                    <select
                        value={seleccionado ?? ''}
                        onChange={(e) => setSeleccionado(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#1e3654] focus:outline-none focus:ring-2 focus:ring-[#1e3654]/30"
                    >
                        {procesos.map((p) => (
                            <option key={p.codigo} value={p.codigo} disabled={!p.prediccion}>
                                {p.codigo}{p.prediccion ? '' : ' (sin datos)'}
                            </option>
                        ))}
                    </select>
                </div>

                {proceso?.prediccion ? (
                    <DetalleProceso proceso={proceso} />
                ) : (
                    <p className="text-sm text-gray-500 py-12 text-center">
                        Este proceso no tiene suficientes meses para proyectar una tendencia.
                    </p>
                )}
            </div>

            {/* Tabla resumen */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-[#1e3654]">Resumen de proyecciones</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#f2f4f7] text-gray-600 text-xs uppercase tracking-wide">
                            <tr>
                                {['Código', 'Proceso', 'Módulo', 'Tendencia', 'Proy. diciembre', 'Meta', 'Alcanza meta en', 'Confiabilidad', 'Estado'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {procesos.map((p) => (
                                <FilaResumen
                                    key={p.codigo}
                                    proceso={p}
                                    activo={p.codigo === seleccionado}
                                    onClick={() => p.prediccion && setSeleccionado(p.codigo)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function DetalleProceso({ proceso }) {
    const { prediccion, unidad } = proceso
    const serie = useMemo(() => construirSerie(prediccion), [prediccion])
    const conf = confiabilidad(prediccion)

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
            <PrediccionLineChart
                serie={serie}
                meta={prediccion.meta_final}
                unidad={unidad}
                esDescendente={prediccion.es_descendente}
            />

            <div className="space-y-3 text-sm">
                <Dato
                    label="Tendencia"
                    icono={iconoTendencia(prediccion.tendencia)}
                    valor={`${prediccion.tendencia} (${prediccion.pendiente > 0 ? '+' : ''}${prediccion.pendiente} ${unidad}/mes)`}
                />
                <Dato
                    label="Proyección a diciembre"
                    icono="event"
                    valor={`${prediccion.valor_diciembre} ${unidad}`}
                />
                <Dato
                    label="Alcanza la meta"
                    icono="flag"
                    valor={prediccion.mes_alcanza_meta ?? 'No dentro del año'}
                />
                <Dato
                    label="Confiabilidad"
                    icono="verified"
                    valor={`${conf.nivel} (R² ${prediccion.r_cuadrado})`}
                    color={conf.color}
                />
                <div className="pt-2">
                    <EstadoMetaBadge prediccion={prediccion} />
                </div>
                <p className="text-xs text-gray-400 pt-2 leading-relaxed">
                    Basado en {prediccion.meses_con_datos} meses. La proyección asume que la
                    tendencia se mantiene; no considera acciones correctivas futuras.
                </p>
            </div>
        </div>
    )
}

function Dato({ label, icono, valor, color }) {
    return (
        <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="flex items-center gap-1.5 font-semibold capitalize" style={{ color: color ?? '#1e3654' }}>
                <span className="material-symbols-outlined text-base">{icono}</span>
                {valor}
            </p>
        </div>
    )
}

function FilaResumen({ proceso, activo, onClick }) {
    const { prediccion } = proceso
    const conf = confiabilidad(prediccion)
    const tendenciaColor = prediccion?.tendencia === 'ascendente'
        ? '#1f7a47'
        : prediccion?.tendencia === 'descendente'
            ? (prediccion.es_descendente ? '#1f7a47' : '#9c1d1d')
            : '#854d0e'

    return (
        <tr
            onClick={onClick}
            className={`transition-colors ${prediccion ? 'cursor-pointer' : ''} ${activo ? 'bg-[#f2f4f7]' : 'hover:bg-[#f2f4f7]/60'}`}
        >
            <td className="px-4 py-3 font-mono font-semibold text-[#1e3654]">{proceso.codigo}</td>
            <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{proceso.proceso}</td>
            <td className="px-4 py-3 text-gray-500">{proceso.modulo}</td>
            {prediccion ? (
                <>
                    <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 font-medium capitalize" style={{ color: tendenciaColor }}>
                            <span className="material-symbols-outlined text-base">{iconoTendencia(prediccion.tendencia)}</span>
                            {prediccion.tendencia}
                        </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#1e3654]">{prediccion.valor_diciembre} {proceso.unidad}</td>
                    <td className="px-4 py-3 text-gray-600">{prediccion.meta_final} {proceso.unidad}</td>
                    <td className="px-4 py-3 text-gray-600">{prediccion.mes_alcanza_meta ?? '—'}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: conf.color }}>{conf.nivel}</td>
                    <td className="px-4 py-3"><EstadoMetaBadge prediccion={prediccion} /></td>
                </>
            ) : (
                <td className="px-4 py-3 text-gray-400 italic" colSpan={6}>Sin datos suficientes para proyectar</td>
            )}
        </tr>
    )
}

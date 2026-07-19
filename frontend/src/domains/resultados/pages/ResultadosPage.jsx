import { useState, useEffect } from 'react'

import PanelAnalisisIA from '../../../shared/components/PanelAnalisisIA'
import SemaforoBadge from '../../../shared/components/SemaforoBadge'
import { useDatos } from '../../../shared/hooks/useDatos'
import InformeEjecutivo from '../components/InformeEjecutivo'
import TarjetaProceso from '../components/TarjetaProceso'
import { obtenerResultados, porcentaje, getErrorMessage } from '../../tablero/services/tableroService'

const FILTROS = [
    { clave: 'todos',     texto: 'Todos los procesos' },
    { clave: 'con_mejora', texto: 'Con mejora aplicada' },
    { clave: 'criticos',  texto: 'Sin cumplir la meta' },
]

function Metrica({ label, valor, detalle, icono, acento }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-500">{label}</p>
                <span className="material-symbols-outlined text-base text-gray-300">{icono}</span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${acento ?? 'text-[#1e3654]'}`}>{valor}</p>
            {detalle && <p className="text-[11px] text-gray-400 mt-0.5">{detalle}</p>}
        </div>
    )
}

/** Efecto agregado de las mejoras: avance actual frente al proyectado. */
function ImpactoMejora({ resumen }) {
    if (!resumen.indicadores_intervenidos) return null
    const positivo = (resumen.ganancia_promedio_pp ?? 0) > 0

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-[#1e3654] mb-1">Efecto proyectado de las mejoras</h2>
            <p className="text-xs text-gray-500 mb-4">
                Comparación entre el desempeño actual y el esperado tras aplicar las mejoras,
                sobre los {resumen.indicadores_intervenidos} indicador(es) intervenidos.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
                <div className="text-center">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">Antes</p>
                    <p className="text-2xl font-bold text-[#1e3654]">{porcentaje(resumen.avance_promedio)}</p>
                    <SemaforoBadge semaforo={resumen.semaforo_global} />
                </div>
                <span className="material-symbols-outlined text-2xl text-gray-300">arrow_forward</span>
                <div className="text-center">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">Proyectado</p>
                    <p className="text-2xl font-bold text-[#1e3654]">{porcentaje(resumen.avance_proyectado)}</p>
                    <SemaforoBadge semaforo={resumen.semaforo_proyectado} />
                </div>
                <div className={`ml-auto px-4 py-2 rounded-lg ${positivo ? 'bg-[#dcf8e8]' : 'bg-[#ffe8e8]'}`}>
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Ganancia promedio</p>
                    <p className={`text-xl font-bold ${positivo ? 'text-[#1f7a47]' : 'text-[#9c1d1d]'}`}>
                        {positivo ? '+' : ''}{resumen.ganancia_promedio_pp} pp
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function ResultadosPage() {
    const { version } = useDatos()
    const [datos, setDatos] = useState(null)
    const [filtro, setFiltro] = useState('todos')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let activo = true
        obtenerResultados()
            .then((data) => { if (activo) { setDatos(data); setError(null) } })
            .catch((err) => { if (activo) setError(getErrorMessage(err)) })
            .finally(() => { if (activo) setIsLoading(false) })
        return () => { activo = false }
    }, [version])

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Cargando resultados…
        </div>
    )

    if (error) return (
        <div className="flex items-center gap-2 p-6 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl">
            <span className="material-symbols-outlined">error</span>{error}
        </div>
    )

    const { resumen, procesos } = datos

    if (procesos.length === 0) return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center space-y-3 max-w-xl mx-auto mt-8">
            <span className="material-symbols-outlined text-5xl text-gray-300">analytics</span>
            <p className="font-semibold text-[#1e3654]">Todavía no hay resultados que analizar</p>
            <p className="text-sm text-gray-500">
                Captura mediciones de tus indicadores y registra el trabajo de mejora
                para ver aquí el resultado consolidado.
            </p>
        </div>
    )

    const visibles = procesos.filter((p) => {
        if (filtro === 'con_mejora') return p.mejora.tiene_algo
        if (filtro === 'criticos') return p.indicadores.some((i) => i.semaforo === 'Rojo' || i.semaforo === 'Amarillo')
        return true
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#1e3654]">Resultados del análisis</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Qué dio cada indicador y qué efecto tuvieron las mejoras aplicadas.
                </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Metrica label="Avance promedio" valor={porcentaje(resumen.avance_promedio)}
                         detalle={resumen.semaforo_global} icono="speed" />
                <Metrica label="Cumplen la meta" valor={`${resumen.cumplen_meta}/${resumen.indicadores}`}
                         detalle={`${resumen.no_cumplen} en rojo`} icono="check_circle"
                         acento="text-[#1f7a47]" />
                <Metrica label="Procesos con mejora" valor={resumen.procesos_con_mejora}
                         detalle={`${resumen.procesos_implementados} implementada(s)`} icono="construction" />
                <Metrica label="Indicadores intervenidos" valor={resumen.indicadores_intervenidos}
                         detalle={resumen.ganancia_promedio_pp !== null ? `${resumen.ganancia_promedio_pp > 0 ? '+' : ''}${resumen.ganancia_promedio_pp} pp promedio` : null}
                         icono="trending_up" />
            </div>

            <ImpactoMejora resumen={resumen} />

            <PanelAnalisisIA
                seccion="resultados"
                titulo="Análisis de los resultados"
                descripcion="La IA contrasta los resultados con el trabajo de mejora registrado y señala qué falta."
            />

            <InformeEjecutivo />

            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h2 className="text-base font-semibold text-[#1e3654]">Detalle por proceso</h2>
                    <div className="flex flex-wrap gap-1">
                        {FILTROS.map((f) => (
                            <button
                                key={f.clave}
                                onClick={() => setFiltro(f.clave)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                    filtro === f.clave ? 'bg-[#1e3654] text-white' : 'text-gray-500 hover:bg-gray-100'
                                }`}
                            >
                                {f.texto}
                            </button>
                        ))}
                    </div>
                </div>

                {visibles.map((p) => <TarjetaProceso key={p.codigo} proceso={p} />)}

                {visibles.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8 bg-white rounded-xl border border-gray-100">
                        No hay procesos que coincidan con este filtro.
                    </p>
                )}
            </div>
        </div>
    )
}

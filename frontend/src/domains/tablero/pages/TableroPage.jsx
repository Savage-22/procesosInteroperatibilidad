import { useState, useEffect } from 'react'

import PanelAnalisisIA from '../../../shared/components/PanelAnalisisIA'
import SemaforoBadge from '../../../shared/components/SemaforoBadge'
import { useDatos } from '../../../shared/hooks/useDatos'
import TablaMonitoreo from '../components/TablaMonitoreo'
import { obtenerTablero, porcentaje, getErrorMessage } from '../services/tableroService'

const PERIODOS = [
    { clave: 'S1', texto: 'S1 · Ene–Jun' },
    { clave: 'S2', texto: 'S2 · Jul–Dic' },
]

function Kpi({ label, valor, detalle, icono, color = 'neutro', destacado = false }) {
    const colores = {
        neutro:   'text-[#1e3654] bg-[#f2f4f7]',
        verde:    'text-[#1f7a47] bg-[#dcf8e8]',
        amarillo: 'text-[#854d0e] bg-[#fef9c3]',
        rojo:     'text-[#9c1d1d] bg-[#ffe8e8]',
    }
    return (
        <div className={`bg-white rounded-xl shadow-sm border p-4 ${destacado ? 'border-[#9c1d1d]/30' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-500">{label}</p>
                <span className={`material-symbols-outlined text-base rounded-lg p-1 ${colores[color]}`}>{icono}</span>
            </div>
            <p className="text-2xl font-bold text-[#1e3654] mt-1">{valor}</p>
            {detalle && <p className="text-[11px] text-gray-400 mt-0.5">{detalle}</p>}
        </div>
    )
}

function ResumenModulos({ modulos }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-[#1e3654] mb-4">Avance por módulo</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {modulos.map((m) => (
                    <div key={m.modulo} className="rounded-lg border border-gray-100 p-3">
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-[#1e3654]">{m.modulo}</span>
                            <SemaforoBadge semaforo={m.semaforo} />
                        </div>
                        <p className="text-xl font-bold text-[#1e3654] mt-1">{porcentaje(m.avance)}</p>
                        <p className="text-[11px] text-gray-400">
                            {m.indicadores} indicador(es)
                            {m.rojos > 0 && <span className="text-[#9c1d1d] font-medium"> · {m.rojos} en rojo</span>}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function TableroPage() {
    const { version } = useDatos()
    const [periodo, setPeriodo] = useState(null)
    const [datos, setDatos] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let activo = true

        async function cargar() {
            setIsLoading(true)
            try {
                const data = await obtenerTablero(periodo)
                if (activo) { setDatos(data); setError(null) }
            } catch (err) {
                if (activo) setError(getErrorMessage(err))
            } finally {
                if (activo) setIsLoading(false)
            }
        }

        cargar()
        return () => { activo = false }
    }, [periodo, version])

    if (isLoading && !datos) return (
        <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Cargando tablero…
        </div>
    )

    if (error) return (
        <div className="flex items-center gap-2 p-6 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl">
            <span className="material-symbols-outlined">error</span>{error}
        </div>
    )

    const { resumen, por_modulo, indicadores } = datos

    if (indicadores.length === 0) return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center space-y-3 max-w-xl mx-auto mt-8">
            <span className="material-symbols-outlined text-5xl text-gray-300">monitoring</span>
            <p className="font-semibold text-[#1e3654]">Aún no hay indicadores que monitorear</p>
            <p className="text-sm text-gray-500">
                Define indicadores y captura al menos una medición para que el tablero cobre vida.
            </p>
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-[#1e3654]">Tablero de control</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Monitoreo indicador por indicador — periodo {datos.periodo.etiqueta}
                    </p>
                </div>
                <div className="flex gap-1 bg-white rounded-lg border border-gray-100 p-1">
                    {PERIODOS.map((p) => (
                        <button
                            key={p.clave}
                            onClick={() => setPeriodo(p.clave)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                datos.periodo.clave === p.clave
                                    ? 'bg-[#1e3654] text-white'
                                    : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            {p.texto}
                        </button>
                    ))}
                </div>
            </div>

            {/* Alerta de indicadores críticos sin plan de mejora */}
            {resumen.criticos_sin_mejora > 0 && (
                <div className="flex items-center gap-3 rounded-xl bg-[#ffe8e8] border border-[#9c1d1d]/30 p-4">
                    <span className="material-symbols-outlined text-2xl text-[#9c1d1d]">crisis_alert</span>
                    <div>
                        <p className="text-sm font-semibold text-[#9c1d1d]">
                            {resumen.criticos_sin_mejora} indicador(es) en rojo sin plan de mejora
                        </p>
                        <p className="text-xs text-[#9c1d1d]/80">
                            Están por debajo del 75 % de avance y no tienen causas ni acciones registradas.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Kpi label="Indicadores" valor={resumen.total} icono="insights"
                     detalle={`${resumen.sin_datos} sin datos`} />
                <Kpi label="Avance promedio" valor={porcentaje(resumen.avance_promedio)} icono="speed"
                     detalle={resumen.semaforo_global}
                     color={resumen.semaforo_global === 'Verde' ? 'verde' : resumen.semaforo_global === 'Rojo' ? 'rojo' : 'amarillo'} />
                <Kpi label="Cumpliendo meta" valor={resumen.verde} icono="check_circle" color="verde" />
                <Kpi label="En observación" valor={resumen.amarillo} icono="warning" color="amarillo" />
                <Kpi label="Críticos" valor={resumen.rojo} icono="cancel" color="rojo"
                     detalle={resumen.en_retroceso > 0 ? `${resumen.en_retroceso} en retroceso` : null}
                     destacado={resumen.rojo > 0} />
            </div>

            <ResumenModulos modulos={por_modulo} />

            <TablaMonitoreo indicadores={indicadores} />

            <PanelAnalisisIA
                seccion="tablero"
                periodo={datos.periodo.clave}
                titulo="Análisis del monitoreo"
                descripcion="La IA revisa el estado de cada indicador y prioriza dónde intervenir primero."
            />
        </div>
    )
}

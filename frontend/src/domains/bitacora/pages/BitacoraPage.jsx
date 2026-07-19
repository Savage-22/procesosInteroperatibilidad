import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

import BotonExportarExcel from '../../../shared/components/BotonExportarExcel'
import { useDatos } from '../../../shared/hooks/useDatos'
import { obtenerBitacora, getErrorMessage } from '../services/bitacoraService'

const ESTADO = {
    completada: {
        texto: 'Completada', icono: 'check_circle',
        punto: 'bg-[#1f7a47] text-white', badge: 'bg-[#dcf8e8] text-[#1f7a47]',
        borde: 'border-[#1f7a47]/25', linea: 'bg-[#1f7a47]',
    },
    en_curso: {
        texto: 'En curso', icono: 'pending',
        punto: 'bg-[#f4d100] text-[#1e3654]', badge: 'bg-[#fef9c3] text-[#854d0e]',
        borde: 'border-[#f4d100]/40', linea: 'bg-[#f4d100]',
    },
    pendiente: {
        texto: 'Pendiente', icono: 'radio_button_unchecked',
        punto: 'bg-gray-200 text-gray-500', badge: 'bg-gray-100 text-gray-500',
        borde: 'border-gray-100', linea: 'bg-gray-200',
    },
}

function BarraProgreso({ progreso }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-end justify-between gap-3 flex-wrap mb-3">
                <div>
                    <h2 className="text-base font-semibold text-[#1e3654]">Avance del trabajo</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {progreso.completadas} de {progreso.total} fases completadas
                        {progreso.en_curso > 0 && ` · ${progreso.en_curso} en curso`}
                    </p>
                </div>
                <p className="text-3xl font-bold text-[#1e3654]">{progreso.porcentaje}%</p>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex">
                <div className="h-full bg-[#1f7a47] transition-all"
                     style={{ width: `${(progreso.completadas / progreso.total) * 100}%` }} />
                <div className="h-full bg-[#f4d100] transition-all"
                     style={{ width: `${(progreso.en_curso / progreso.total) * 100}%` }} />
            </div>
        </div>
    )
}

function Fase({ fase, ultima }) {
    const e = ESTADO[fase.estado] ?? ESTADO.pendiente

    return (
        <div className="flex gap-4">
            {/* Línea de tiempo */}
            <div className="flex flex-col items-center shrink-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${e.punto}`}>
                    {fase.estado === 'completada'
                        ? <span className="material-symbols-outlined text-lg">check</span>
                        : fase.numero}
                </div>
                {!ultima && <div className={`w-0.5 flex-1 min-h-[24px] mt-1 ${e.linea}`} />}
            </div>

            {/* Contenido */}
            <div className={`flex-1 mb-5 rounded-xl border bg-white p-4 ${e.borde}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-2 min-w-0">
                        <span className="material-symbols-outlined text-[#1e3654] text-xl shrink-0 mt-0.5">
                            {fase.icono}
                        </span>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-[#1e3654]">{fase.titulo}</h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">{fase.metodologia}</p>
                        </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${e.badge}`}>
                        {e.texto}
                    </span>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed mt-3">{fase.que_se_hizo}</p>

                <div className="flex items-center justify-between gap-3 flex-wrap mt-3 pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={`material-symbols-outlined text-base ${
                            fase.estado === 'completada' ? 'text-[#1f7a47]'
                                : fase.estado === 'en_curso' ? 'text-[#854d0e]' : 'text-gray-300'
                        }`}>
                            {e.icono}
                        </span>
                        <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">Evidencia en el sistema</p>
                            <p className="text-xs font-medium text-gray-700">{fase.evidencia.etiqueta}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded bg-[#f2f4f7] text-[10px] font-medium text-gray-500">
                            {fase.entregable}
                        </span>
                        <Link
                            to={fase.ruta}
                            className="flex items-center gap-1 text-xs font-medium text-[#0075ca] hover:underline"
                        >
                            Ver
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * Bitácora del proyecto: narra las fases metodológicas del trabajo y adjunta
 * como evidencia los datos que realmente hay cargados en cada momento, de modo
 * que el estado de cada fase nunca queda desincronizado de lo hecho.
 */
export default function BitacoraPage() {
    const { version } = useDatos()
    const [datos, setDatos] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let activo = true
        obtenerBitacora()
            .then((data) => { if (activo) { setDatos(data); setError(null) } })
            .catch((err) => { if (activo) setError(getErrorMessage(err)) })
            .finally(() => { if (activo) setIsLoading(false) })
        return () => { activo = false }
    }, [version])

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Cargando bitácora…
        </div>
    )

    if (error) return (
        <div className="flex items-center gap-2 p-6 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl">
            <span className="material-symbols-outlined">error</span>{error}
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap no-print">
                <div>
                    <h1 className="text-2xl font-bold text-[#1e3654]">Bitácora del proyecto</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Registro de todo lo trabajado en {datos.organizacion.nombre}, fase por fase,
                        con la evidencia cargada en el sistema.
                    </p>
                </div>
                <div className="flex items-start gap-2 flex-wrap">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-[#1e3654] border border-gray-200 bg-white hover:bg-gray-50"
                    >
                        <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                        Descargar PDF
                    </button>
                    <BotonExportarExcel />
                </div>
            </div>

            <div className="zona-imprimible space-y-6">
                <BarraProgreso progreso={datos.progreso} />

                <div>
                    {datos.fases.map((fase, i) => (
                        <Fase key={fase.clave} fase={fase} ultima={i === datos.fases.length - 1} />
                    ))}
                </div>
            </div>
        </div>
    )
}

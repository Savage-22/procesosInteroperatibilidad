import { useState, useEffect } from 'react'

import { obtenerEstadoIA, getErrorIA } from '../../../shared/services/analisisService'

/**
 * Envoltorio común de los asistentes de IA del onboarding: se encarga de saber
 * si la IA está disponible, de pedir la sugerencia y de exponer el resultado a
 * quien lo renderice. Cada paso decide cómo mostrar y aceptar lo sugerido.
 *
 * Ningún dato se guarda solo: el usuario revisa y confirma, porque el contenido
 * de los anexos es responsabilidad de la entidad, no del modelo.
 */
export default function SugerenciasIA({
    titulo,
    descripcion,
    textoBoton = 'Sugerir con IA',
    onPedir,
    children,
    deshabilitado = false,
    motivoDeshabilitado,
}) {
    const [disponible, setDisponible] = useState(false)
    const [resultado, setResultado] = useState(null)
    const [cargando, setCargando] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        let activo = true
        obtenerEstadoIA().then((estado) => { if (activo) setDisponible(estado.disponible) })
        return () => { activo = false }
    }, [])

    async function pedir() {
        setCargando(true)
        setError(null)
        try {
            setResultado(await onPedir())
        } catch (err) {
            setError(getErrorIA(err))
        } finally {
            setCargando(false)
        }
    }

    if (!disponible) return null

    return (
        <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-[#f2f4f7] to-white p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[#1e3654] bg-[#f4d100] rounded-lg p-1 text-lg">
                        auto_awesome
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-[#1e3654]">{titulo}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{descripcion}</p>
                    </div>
                </div>
                <button
                    onClick={pedir}
                    disabled={cargando || deshabilitado}
                    title={deshabilitado ? motivoDeshabilitado : undefined}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56] disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined text-base ${cargando ? 'animate-spin' : ''}`}>
                        {cargando ? 'progress_activity' : 'auto_awesome'}
                    </span>
                    {cargando ? 'Pensando…' : textoBoton}
                </button>
            </div>

            {error && (
                <p className="flex items-center gap-2 text-sm text-[#9c1d1d] bg-[#ffe8e8] rounded-lg px-3 py-2 mt-3">
                    <span className="material-symbols-outlined text-base">error</span>{error}
                </p>
            )}

            {resultado && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                    {children({ resultado, cerrar: () => setResultado(null) })}
                </div>
            )}
        </div>
    )
}

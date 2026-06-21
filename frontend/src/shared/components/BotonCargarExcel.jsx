import { useRef, useState } from 'react'

import { useDatos } from '../hooks/useDatos'
import { subirExcel, getUploadErrorMessage } from '../services/excelService'

const ICONO_ESTADO = {
    idle: 'upload_file',
    loading: 'progress_activity',
    ok: 'check_circle',
    error: 'error',
}

export default function BotonCargarExcel({ iconOnly = false }) {
    const inputRef = useRef(null)
    const { refrescar } = useDatos()
    const [estado, setEstado] = useState('idle')
    const [mensajeError, setMensajeError] = useState(null)

    async function handleArchivo(e) {
        const archivo = e.target.files[0]
        // Se limpia para permitir volver a subir el mismo archivo
        e.target.value = ''
        if (!archivo) return

        setEstado('loading')
        setMensajeError(null)
        try {
            await subirExcel(archivo)
            await refrescar()
            setEstado('ok')
        } catch (err) {
            setMensajeError(getUploadErrorMessage(err))
            setEstado('error')
        } finally {
            setTimeout(() => setEstado('idle'), 4000)
        }
    }

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xlsm"
                onChange={handleArchivo}
                className="hidden"
            />
            <button
                onClick={() => inputRef.current?.click()}
                disabled={estado === 'loading'}
                title={estado === 'error' ? mensajeError : 'Subir un nuevo Excel de datos'}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    estado === 'error'
                        ? 'text-[#ffb4b4] hover:bg-white/10'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
            >
                <span className={`material-symbols-outlined text-base ${estado === 'loading' ? 'animate-spin' : ''}`}>
                    {ICONO_ESTADO[estado]}
                </span>
                {!iconOnly && (estado === 'ok' ? 'Datos cargados' : estado === 'error' ? 'Error al subir' : 'Cargar Excel')}
            </button>
        </>
    )
}

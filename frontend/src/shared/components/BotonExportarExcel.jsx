import { useState } from 'react'

import httpClient from '../../infrastructure/httpClient'

/** Lee el nombre que propone el backend en Content-Disposition. */
function nombreDesdeCabecera(cabecera, porDefecto) {
    const encontrado = /filename="?([^"]+)"?/.exec(cabecera || '')
    return encontrado ? encontrado[1] : porDefecto
}

/**
 * Descarga el Excel con el estado actual del sistema. A diferencia de la
 * plantilla (que está vacía y sirve para empezar), este libro sale de la base
 * de datos e incluye lo que el Excel inicial no tiene: fichas SIPOC,
 * indicadores caracterizados y el ciclo de mejora completo.
 */
export default function BotonExportarExcel({ variante = 'primario' }) {
    const [descargando, setDescargando] = useState(false)
    const [error, setError] = useState(null)

    async function handleDescargar() {
        if (descargando) return
        setDescargando(true)
        setError(null)
        try {
            const res = await httpClient.get('/api/export/excel', { responseType: 'blob' })
            const url = URL.createObjectURL(res.data)
            const a = document.createElement('a')
            a.href = url
            a.download = nombreDesdeCabecera(res.headers['content-disposition'], 'SIIP.xlsx')
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            setError('No se pudo generar el Excel. Verifica que el servidor esté activo.')
        } finally {
            setDescargando(false)
        }
    }

    const estilo = variante === 'primario'
        ? 'bg-[#1f7a47] text-white hover:brightness-95'
        : 'text-[#1e3654] border border-gray-200 hover:bg-gray-50'

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={handleDescargar}
                disabled={descargando}
                title="Descargar un Excel con todo lo registrado: datos, fichas, indicadores y mejora"
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${estilo}`}
            >
                <span className={`material-symbols-outlined text-base ${descargando ? 'animate-spin' : ''}`}>
                    {descargando ? 'progress_activity' : 'table_view'}
                </span>
                {descargando ? 'Generando…' : 'Exportar Excel actualizado'}
            </button>
            {error && <p className="text-xs text-[#9c1d1d]">{error}</p>}
        </div>
    )
}

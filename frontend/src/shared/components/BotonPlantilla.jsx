import { useState } from 'react'

import httpClient from '../../infrastructure/httpClient'

export default function BotonPlantilla() {
    const [descargando, setDescargando] = useState(false)

    async function handleDescargar() {
        if (descargando) return
        setDescargando(true)
        try {
            const res = await httpClient.get('/api/plantilla', { responseType: 'blob' })
            const url = URL.createObjectURL(res.data)
            const a = document.createElement('a')
            a.href = url
            a.download = 'plantilla_ceplan.xlsx'
            a.click()
            URL.revokeObjectURL(url)
        } finally {
            setDescargando(false)
        }
    }

    return (
        <button
            onClick={handleDescargar}
            disabled={descargando}
            title="Descargar plantilla Excel para rellenar con datos propios"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
        >
            <span className={`material-symbols-outlined text-base ${descargando ? 'animate-spin' : ''}`}>
                {descargando ? 'progress_activity' : 'download'}
            </span>
            Plantilla
        </button>
    )
}

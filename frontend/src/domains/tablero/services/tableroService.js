import * as api from '../api/tableroApi'

export async function obtenerTablero(periodo) { return (await api.getTablero(periodo)).data }
export async function obtenerResultados() { return (await api.getResultados()).data }

export const TENDENCIA = {
    mejora:    { icono: 'trending_up',   color: 'text-[#1f7a47]', texto: 'Mejora' },
    retroceso: { icono: 'trending_down', color: 'text-[#9c1d1d]', texto: 'Retrocede' },
    estable:   { icono: 'trending_flat', color: 'text-gray-400',  texto: 'Estable' },
    sin_datos: { icono: 'remove',        color: 'text-gray-300',  texto: 'Sin datos' },
}

export const ETAPA_MEJORA = {
    sin_iniciar:   { texto: 'Sin iniciar',    color: 'bg-gray-100 text-gray-500' },
    diagnosticada: { texto: 'Diagnosticada',  color: 'bg-[#dbeafe] text-[#1e40af]' },
    priorizada:    { texto: 'Priorizada',     color: 'bg-[#e0e7ff] text-[#4338ca]' },
    proyectada:    { texto: 'Proyectada',     color: 'bg-[#fef9c3] text-[#854d0e]' },
    en_ejecucion:  { texto: 'En ejecución',   color: 'bg-[#ffedd5] text-[#9a3412]' },
    implementada:  { texto: 'Implementada',   color: 'bg-[#dcf8e8] text-[#1f7a47]' },
}

/** Formatea un valor numérico con su unidad; '—' cuando no hay dato. */
export function formatear(valor, unidad = '') {
    if (valor === null || valor === undefined) return '—'
    const numero = Number.isInteger(valor) ? valor : Number(valor.toFixed(2))
    return `${numero}${unidad && unidad !== '—' ? ` ${unidad}` : ''}`
}

export function porcentaje(valor) {
    return valor === null || valor === undefined ? '—' : `${valor.toFixed(1)}%`
}

export function getErrorMessage(error) {
    if (error.response?.data?.detail) return error.response.data.detail
    return 'No se pudo cargar la información. Verifica que el servidor esté activo.'
}

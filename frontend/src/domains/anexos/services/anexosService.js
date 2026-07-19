import * as api from '../api/anexosApi'

export async function obtenerIndice() { return (await api.getIndice()).data }

export async function obtenerAnexo(numero, codigo) {
    if (numero === 1) return (await api.getAnexo1()).data
    if (numero === 2) return (await api.getAnexo2(codigo)).data
    return (await api.getAnexo4(codigo)).data
}

/** Los anexos 2 y 4 documentan un proceso concreto; el 1 es de toda la entidad. */
export function requiereProceso(numero) {
    return numero !== 1
}

export function formatearFecha(iso) {
    if (!iso) return ''
    const fecha = new Date(`${iso}T00:00:00`)
    if (isNaN(fecha)) return iso
    return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function getErrorMessage(error) {
    if (error.response?.data?.detail) return error.response.data.detail
    return 'No se pudo cargar el anexo. Verifica que el servidor esté activo.'
}

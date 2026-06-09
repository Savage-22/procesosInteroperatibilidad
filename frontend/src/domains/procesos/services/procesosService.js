import { getProceso } from '../api/procesosApi'

export async function getProcesoDetalle(codigo) {
    const res = await getProceso(codigo)
    return res.data
}

export function getProcesoErrorMessage(error) {
    if (error.response?.status === 404) return `Proceso '${error.config?.url?.split('/').pop()}' no encontrado.`
    if (error.response?.data?.detail) return error.response.data.detail
    return 'No se pudo cargar el proceso.'
}

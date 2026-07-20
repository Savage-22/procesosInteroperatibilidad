import httpClient from '../../../infrastructure/httpClient'

export async function getInvestigaciones(macroproceso = null) {
    const params = macroproceso ? { macroproceso } : undefined
    return (await httpClient.get('/api/investigaciones', { params })).data
}
export async function crearInvestigacion(datos) {
    return (await httpClient.post('/api/investigaciones', datos)).data
}
export async function actualizarInvestigacion(id, datos) {
    return (await httpClient.put(`/api/investigaciones/${id}`, datos)).data
}
export async function eliminarInvestigacion(id) {
    return (await httpClient.delete(`/api/investigaciones/${id}`)).data
}

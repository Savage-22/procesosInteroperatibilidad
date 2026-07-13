import httpClient from '../../../infrastructure/httpClient'

export async function getIndicadores(codigo) {
    const res = await httpClient.get(`/api/procesos/${codigo}/indicadores`)
    return res.data
}

export async function crearIndicador(codigo, datos) {
    const res = await httpClient.post(`/api/procesos/${codigo}/indicadores`, datos)
    return res.data
}

export async function actualizarIndicador(id, datos) {
    const res = await httpClient.put(`/api/indicadores/${id}`, datos)
    return res.data
}

export async function eliminarIndicador(id) {
    const res = await httpClient.delete(`/api/indicadores/${id}`)
    return res.data
}

export async function guardarMedicion(indicadorId, datos) {
    const res = await httpClient.post(`/api/indicadores/${indicadorId}/mediciones`, datos)
    return res.data
}

export async function eliminarMedicion(id) {
    const res = await httpClient.delete(`/api/mediciones/${id}`)
    return res.data
}

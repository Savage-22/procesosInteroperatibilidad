import httpClient from '../../../infrastructure/httpClient'

export async function getFichaProceso(codigo) {
    const res = await httpClient.get(`/api/procesos/${codigo}/ficha`)
    return res.data
}

export async function guardarFichaProceso(codigo, datos) {
    const res = await httpClient.put(`/api/procesos/${codigo}/ficha`, datos)
    return res.data
}

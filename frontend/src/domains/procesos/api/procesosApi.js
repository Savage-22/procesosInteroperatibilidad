import httpClient from '../../../infrastructure/httpClient'

export async function getProceso(codigo) {
    const res = await httpClient.get(`/api/procesos/${codigo}`)
    return res.data
}

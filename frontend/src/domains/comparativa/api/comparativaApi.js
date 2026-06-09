import httpClient from '../../../infrastructure/httpClient'

export async function getComparativa() {
    const res = await httpClient.get('/api/comparativa')
    return res.data
}

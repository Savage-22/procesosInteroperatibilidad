import httpClient from '../../../infrastructure/httpClient'

export async function getMetodologia() {
    const res = await httpClient.get('/api/metodologia')
    return res.data
}

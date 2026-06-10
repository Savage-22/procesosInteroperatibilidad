import httpClient from '../../infrastructure/httpClient'

export async function getMeta() {
    const res = await httpClient.get('/api/meta')
    return res.data
}

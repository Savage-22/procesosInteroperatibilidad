import httpClient from '../../../infrastructure/httpClient'

export async function getObjetivos() {
    const res = await httpClient.get('/api/objetivos')
    return res.data
}

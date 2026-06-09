import httpClient from '../../../infrastructure/httpClient'

export async function getPareto() {
    const res = await httpClient.get('/api/pareto')
    return res.data
}

import httpClient from '../../../infrastructure/httpClient'

export async function getDashboard() {
    const res = await httpClient.get('/api/dashboard')
    return res.data
}

export async function getProcesos() {
    const res = await httpClient.get('/api/procesos')
    return res.data
}

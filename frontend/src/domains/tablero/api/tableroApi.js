import httpClient from '../../../infrastructure/httpClient'

export async function getTablero(periodo) {
    const query = periodo ? `?periodo=${periodo}` : ''
    return (await httpClient.get(`/api/tablero${query}`)).data
}

export async function getResultados() {
    return (await httpClient.get('/api/resultados')).data
}

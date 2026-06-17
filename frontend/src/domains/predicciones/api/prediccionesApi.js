import httpClient from '../../../infrastructure/httpClient'

export async function getPredicciones() {
    const res = await httpClient.get('/api/predicciones')
    return res.data
}

import httpClient from '../../../infrastructure/httpClient'

export async function getBitacora() {
    return (await httpClient.get('/api/bitacora')).data
}

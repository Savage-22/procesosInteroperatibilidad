import httpClient from '../../../infrastructure/httpClient'

export async function getOrganizacion() {
    const res = await httpClient.get('/api/organizacion')
    return res.data
}

export async function guardarOrganizacion(datos) {
    const res = await httpClient.put('/api/organizacion', datos)
    return res.data
}

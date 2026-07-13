import httpClient from '../../../infrastructure/httpClient'

export async function getInventario() {
    const res = await httpClient.get('/api/inventario')
    return res.data
}

export async function crearProceso(datos) {
    const res = await httpClient.post('/api/inventario', datos)
    return res.data
}

export async function actualizarProceso(id, datos) {
    const res = await httpClient.put(`/api/inventario/${id}`, datos)
    return res.data
}

export async function eliminarProceso(id) {
    const res = await httpClient.delete(`/api/inventario/${id}`)
    return res.data
}

export async function cargarPlantilla() {
    const res = await httpClient.post('/api/inventario/plantilla')
    return res.data
}

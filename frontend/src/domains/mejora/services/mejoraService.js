import * as api from '../api/mejoraApi'

export async function obtenerCausas(codigo) { return (await api.getCausas(codigo)).data }
export async function guardarCausa(codigo, datos, id = null) {
    return (id ? await api.actualizarCausa(id, datos) : await api.crearCausa(codigo, datos)).data
}
export async function borrarCausa(id) { return api.eliminarCausa(id) }

export async function obtenerOportunidades(codigo) { return (await api.getOportunidades(codigo)).data }
export async function guardarOportunidad(codigo, datos, id = null) {
    return (id ? await api.actualizarOportunidad(id, datos) : await api.crearOportunidad(codigo, datos)).data
}
export async function borrarOportunidad(id) { return api.eliminarOportunidad(id) }

export async function obtenerComparacion(codigo) { return (await api.getComparacion(codigo)).data }
export async function guardarProyeccion(indicadorId, datos) { return (await api.guardarProyeccion(indicadorId, datos)).data }
export async function sugerirProyeccion(indicadorId) { return (await api.sugerirProyeccion(indicadorId)).data }

export function getErrorMessage(error) {
    if (error.response?.data?.detail) return error.response.data.detail
    return 'No se pudo completar la operación. Verifica que el servidor esté activo.'
}

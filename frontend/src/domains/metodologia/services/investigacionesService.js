import * as api from '../api/investigacionesApi'

export async function obtenerInvestigaciones(macroproceso = null) {
    return (await api.getInvestigaciones(macroproceso)).data
}
export async function guardarInvestigacion(datos, id = null) {
    return (id ? await api.actualizarInvestigacion(id, datos) : await api.crearInvestigacion(datos)).data
}
export async function borrarInvestigacion(id) { return api.eliminarInvestigacion(id) }

export function getErrorMessage(error) {
    if (error.response?.data?.detail) return error.response.data.detail
    return 'No se pudo completar la operación. Verifica que el servidor esté activo.'
}

import {
    getIndicadores,
    crearIndicador,
    actualizarIndicador,
    eliminarIndicador,
    guardarMedicion,
    eliminarMedicion,
} from '../api/indicadoresApi'

export async function obtenerIndicadores(codigo) {
    const res = await getIndicadores(codigo)
    return res.data
}

export async function guardarIndicador(codigo, datos, id = null) {
    const res = id ? await actualizarIndicador(id, datos) : await crearIndicador(codigo, datos)
    return res.data
}

export async function borrarIndicador(id) {
    return eliminarIndicador(id)
}

export async function capturarMedicion(indicadorId, datos) {
    const res = await guardarMedicion(indicadorId, datos)
    return res.data
}

export async function borrarMedicion(id) {
    return eliminarMedicion(id)
}

export function getErrorMessage(error) {
    if (error.response?.status === 404) return 'El recurso no existe.'
    if (error.response?.data?.detail) return error.response.data.detail
    return 'No se pudo completar la operación. Verifica que el servidor esté activo.'
}

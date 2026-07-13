import {
    getInventario,
    crearProceso,
    actualizarProceso,
    eliminarProceso,
    cargarPlantilla,
} from '../api/inventarioApi'

export async function obtenerInventario() {
    const res = await getInventario()
    return res.data
}

export async function guardarProceso(datos, id = null) {
    const res = id ? await actualizarProceso(id, datos) : await crearProceso(datos)
    return res.data
}

export async function borrarProceso(id) {
    return eliminarProceso(id)
}

export async function precargarPlantilla() {
    const res = await cargarPlantilla()
    return res.data
}

export function getErrorMessage(error) {
    if (error.response?.data?.detail) return error.response.data.detail
    return 'No se pudo completar la operación. Verifica que el servidor esté activo.'
}

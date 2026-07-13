import { getFichaProceso, guardarFichaProceso } from '../api/fichaProcesoApi'

export async function obtenerFicha(codigo) {
    const res = await getFichaProceso(codigo)
    return res.data
}

export async function guardarFicha(codigo, datos) {
    const res = await guardarFichaProceso(codigo, datos)
    return res.data
}

export function getErrorMessage(error) {
    if (error.response?.status === 404) return 'El proceso no existe en el inventario.'
    if (error.response?.data?.detail) return error.response.data.detail
    return 'No se pudo completar la operación. Verifica que el servidor esté activo.'
}

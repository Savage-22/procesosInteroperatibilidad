import { getBitacora } from '../api/bitacoraApi'

export async function obtenerBitacora() {
    return (await getBitacora()).data
}

export function getErrorMessage(error) {
    if (error.response?.data?.detail) return error.response.data.detail
    return 'No se pudo cargar la bitácora. Verifica que el servidor esté activo.'
}

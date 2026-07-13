import { getOrganizacion, guardarOrganizacion } from '../api/organizacionApi'

export async function obtenerResumen() {
    const res = await getOrganizacion()
    return res.data
}

export async function actualizarOrganizacion(datos) {
    const res = await guardarOrganizacion(datos)
    return res.data
}

export function getErrorMessage(error) {
    if (error.response?.data?.detail) return error.response.data.detail
    return 'No se pudo completar la operación. Verifica que el servidor esté activo.'
}

// Aplana el árbol de inventario a una lista de nodos (para selects y progreso)
export function aplanarArbol(arbol) {
    const salida = []
    const recorrer = (nodos) => {
        for (const nodo of nodos) {
            salida.push(nodo)
            if (nodo.hijos?.length) recorrer(nodo.hijos)
        }
    }
    recorrer(arbol ?? [])
    return salida
}

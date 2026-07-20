import * as api from '../api/analisisApi'

export async function obtenerEstadoIA() {
    try {
        return (await api.getEstadoIA()).data
    } catch {
        // Si el backend no responde, la interfaz oculta las acciones de IA
        return { disponible: false }
    }
}

export async function analizar(seccion, datos) { return (await api.analizarSeccion(seccion, datos)).data }
export async function obtenerInforme(periodo) { return (await api.getInforme(periodo)).data }
export async function obtenerInformeModulo(modulo, periodo) {
    return (await api.getInformeModulo(modulo, periodo)).data
}
export async function obtenerInformeComparativa(codigos) {
    return (await api.getInformeComparativa(codigos)).data
}

/**
 * Lo último que la IA redactó para ese tipo y alcance, o null si aún no hay
 * nada. Se consulta al montar cada vista para que un informe generado antes no
 * se pierda al navegar. Un fallo aquí no es un error de cara al usuario: se
 * trata como "todavía no hay informe" y el botón de generar sigue disponible.
 */
export async function obtenerGuardado(tipo, alcance = '') {
    try {
        return (await api.getGuardado(tipo, alcance)).data
    } catch {
        return null
    }
}

export async function descartarGuardado(tipo, alcance = '') {
    return (await api.borrarGuardado(tipo, alcance)).data
}
export async function pedirIndicadores(codigo) { return (await api.sugerirIndicadores(codigo)).data }
export async function pedirSipoc(codigo) { return (await api.sugerirSipoc(codigo)).data }
export async function pedirCausas(codigo) { return (await api.sugerirCausas(codigo)).data }
export async function pedirMejoraCompleta(codigo) { return (await api.completarMejora(codigo)).data }
export async function aplicarMejoraCompleta(codigo, propuesta) {
    return (await api.aplicarMejora(codigo, propuesta)).data
}
export async function preguntar(datos) { return (await api.explicar(datos)).data }

export function getErrorIA(error) {
    const status = error.response?.status
    if (status === 503) return 'El asistente IA no está configurado en este servidor.'
    if (status === 502) return 'No se pudo contactar al servicio de IA. Inténtalo de nuevo.'
    if (error.response?.data?.detail) return error.response.data.detail
    return 'No se pudo generar el análisis.'
}

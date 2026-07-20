import httpClient from '../../infrastructure/httpClient'

export async function getEstadoIA() {
    return (await httpClient.get('/api/analisis/estado')).data
}

export async function analizarSeccion(seccion, datos = {}) {
    return (await httpClient.post(`/api/analisis/seccion/${seccion}`, datos)).data
}

export async function getInforme(periodo) {
    const query = periodo ? `?periodo=${periodo}` : ''
    return (await httpClient.get(`/api/analisis/informe${query}`)).data
}

export async function getInformeModulo(modulo, periodo) {
    const query = periodo ? `?periodo=${periodo}` : ''
    return (await httpClient.get(`/api/analisis/informe/modulo/${modulo}${query}`)).data
}

export async function getInformeComparativa(codigos) {
    return (await httpClient.post('/api/analisis/informe/comparativa', { codigos })).data
}

export async function getGuardado(tipo, alcance = '') {
    return (await httpClient.get(`/api/analisis/guardados/${tipo}`, { params: { alcance } })).data
}

export async function borrarGuardado(tipo, alcance = '') {
    return (await httpClient.delete(`/api/analisis/guardados/${tipo}`, { params: { alcance } })).data
}

export async function sugerirIndicadores(codigo) {
    return (await httpClient.post(`/api/analisis/sugerir/indicadores/${codigo}`)).data
}

export async function sugerirSipoc(codigo) {
    return (await httpClient.post(`/api/analisis/sugerir/sipoc/${codigo}`)).data
}

export async function sugerirCausas(codigo) {
    return (await httpClient.post(`/api/analisis/sugerir/causas/${codigo}`)).data
}

export async function completarMejora(codigo) {
    return (await httpClient.post(`/api/analisis/mejora/${codigo}`)).data
}

export async function aplicarMejora(codigo, propuesta) {
    return (await httpClient.post(`/api/analisis/mejora/${codigo}/aplicar`, propuesta)).data
}

export async function explicar(datos) {
    return (await httpClient.post('/api/analisis/explicar', datos)).data
}

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

export async function sugerirIndicadores(codigo) {
    return (await httpClient.post(`/api/analisis/sugerir/indicadores/${codigo}`)).data
}

export async function sugerirSipoc(codigo) {
    return (await httpClient.post(`/api/analisis/sugerir/sipoc/${codigo}`)).data
}

export async function sugerirCausas(codigo) {
    return (await httpClient.post(`/api/analisis/sugerir/causas/${codigo}`)).data
}

export async function explicar(datos) {
    return (await httpClient.post('/api/analisis/explicar', datos)).data
}

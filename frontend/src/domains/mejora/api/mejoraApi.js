import httpClient from '../../../infrastructure/httpClient'

// ── Causas (Ishikawa 6M) ──────────────────────────────────────────
export async function getCausas(codigo) {
    return (await httpClient.get(`/api/procesos/${codigo}/causas`)).data
}
export async function crearCausa(codigo, datos) {
    return (await httpClient.post(`/api/procesos/${codigo}/causas`, datos)).data
}
export async function actualizarCausa(id, datos) {
    return (await httpClient.put(`/api/causas/${id}`, datos)).data
}
export async function eliminarCausa(id) {
    return (await httpClient.delete(`/api/causas/${id}`)).data
}

// ── Oportunidades (F = C × I) ─────────────────────────────────────
export async function getOportunidades(codigo) {
    return (await httpClient.get(`/api/procesos/${codigo}/oportunidades`)).data
}
export async function crearOportunidad(codigo, datos) {
    return (await httpClient.post(`/api/procesos/${codigo}/oportunidades`, datos)).data
}
export async function actualizarOportunidad(id, datos) {
    return (await httpClient.put(`/api/oportunidades/${id}`, datos)).data
}
export async function eliminarOportunidad(id) {
    return (await httpClient.delete(`/api/oportunidades/${id}`)).data
}

// ── Comparación Antes/Después ─────────────────────────────────────
export async function getComparacion(codigo) {
    return (await httpClient.get(`/api/procesos/${codigo}/comparacion`)).data
}
export async function guardarProyeccion(indicadorId, datos) {
    return (await httpClient.put(`/api/indicadores/${indicadorId}/proyeccion`, datos)).data
}
export async function sugerirProyeccion(indicadorId) {
    return (await httpClient.get(`/api/indicadores/${indicadorId}/proyeccion/sugerir`)).data
}

// ── Gestión del cambio (Kurt Lewin) ───────────────────────────────
export async function getCambio(codigo) {
    return (await httpClient.get(`/api/procesos/${codigo}/cambio`)).data
}
export async function crearAccionCambio(codigo, datos) {
    return (await httpClient.post(`/api/procesos/${codigo}/cambio`, datos)).data
}
export async function actualizarAccionCambio(id, datos) {
    return (await httpClient.put(`/api/cambio/${id}`, datos)).data
}
export async function eliminarAccionCambio(id) {
    return (await httpClient.delete(`/api/cambio/${id}`)).data
}

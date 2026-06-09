import { getPareto } from '../api/paretoApi'

export async function getParetoData() {
    const res = await getPareto()
    return res.data
}

export function getParetoErrorMessage(error) {
    if (error.response?.data?.detail) return error.response.data.detail
    return 'No se pudo cargar el análisis Pareto.'
}

import { getDashboard, getProcesos } from '../api/dashboardApi'

export async function getDashboardData() {
    const [dashboard, procesos] = await Promise.all([
        getDashboard(),
        getProcesos(),
    ])
    return {
        kpis: dashboard.data,
        procesos: procesos.data,
    }
}

export function getDashboardErrorMessage(error) {
    if (error.response?.data?.detail) return error.response.data.detail
    return 'No se pudo cargar el dashboard.'
}

import { getComparativa } from '../api/comparativaApi'

const ORDEN_MESES = {
    Enero: 1, Febrero: 2, Marzo: 3, Abril: 4, Mayo: 5, Junio: 6,
    Julio: 7, Agosto: 8, Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12,
}

export async function getComparativaData() {
    const res = await getComparativa()
    return res.data
}

export function transformarParaGrafico(procesos) {
    const todosLosMeses = [
        ...new Set(procesos.flatMap((p) => p.meses.map((m) => m.mes))),
    ].sort((a, b) => (ORDEN_MESES[a] ?? 99) - (ORDEN_MESES[b] ?? 99))

    return todosLosMeses.map((mes) => {
        const fila = { mes }
        procesos.forEach((p) => {
            const mesData = p.meses.find((m) => m.mes === mes)
            fila[p.codigo] = mesData?.avance_t1 ?? null
        })
        return fila
    })
}

export function getComparativaErrorMessage(error) {
    if (error.response?.data?.detail) return error.response.data.detail
    return 'No se pudo cargar la comparativa.'
}

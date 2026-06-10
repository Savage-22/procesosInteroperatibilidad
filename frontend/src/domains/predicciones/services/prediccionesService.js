import { getPredicciones } from '../api/prediccionesApi'

export async function getPrediccionesData() {
    const res = await getPredicciones()
    return res.data
}

export function getPrediccionesErrorMessage(error) {
    if (error.response?.data?.detail) return error.response.data.detail
    return 'No se pudieron cargar las predicciones.'
}

/**
 * Combina histórico y proyección en una sola serie para Recharts.
 * El último mes con datos reales también inicia la proyección, para que
 * ambas líneas se conecten sin un hueco. Cada punto lleva `real` y
 * `proyectado`; los meses sin dato en una serie van como null.
 */
export function construirSerie(prediccion) {
    if (!prediccion) return []

    const serie = prediccion.historico.map((p) => ({
        mes: p.mes,
        real: p.valor,
        proyectado: null,
    }))

    const ultimo = serie[serie.length - 1]
    if (ultimo) ultimo.proyectado = ultimo.real

    prediccion.proyeccion.forEach((p) => {
        serie.push({ mes: p.mes, real: null, proyectado: p.valor })
    })

    return serie
}

/** Reparte los procesos en cubetas de estado para los KPIs y la tabla. */
export function clasificarPorEstado(procesos) {
    const enCamino = []
    const enRiesgo = []
    const sinDatos = []

    procesos.forEach((p) => {
        if (!p.prediccion) sinDatos.push(p)
        else if (p.prediccion.alcanzara_meta) enCamino.push(p)
        else enRiesgo.push(p)
    })

    return { enCamino, enRiesgo, sinDatos }
}

const ICONO_TENDENCIA = {
    ascendente: 'trending_up',
    descendente: 'trending_down',
    estable: 'trending_flat',
}

export function iconoTendencia(tendencia) {
    return ICONO_TENDENCIA[tendencia] ?? 'remove'
}

/**
 * Confiabilidad cualitativa de la proyección a partir del R² y la
 * cantidad de meses. Con pocos puntos la tendencia es indicativa.
 */
export function confiabilidad(prediccion) {
    if (!prediccion) return null
    const { r_cuadrado: r2, meses_con_datos: n } = prediccion
    if (n < 3 || r2 < 0.6) return { nivel: 'Baja', color: '#9c1d1d' }
    if (r2 < 0.85) return { nivel: 'Media', color: '#b8860b' }
    return { nivel: 'Alta', color: '#1f7a47' }
}

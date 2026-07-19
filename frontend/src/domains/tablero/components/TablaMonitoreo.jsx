import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import SemaforoBadge from '../../../shared/components/SemaforoBadge'
import { SEMAFORO_COLOR } from '../../../shared/semaforo'
import { TENDENCIA, formatear } from '../services/tableroService'

/** Barra de avance contra la meta, coloreada con el semáforo del indicador. */
function BarraAvance({ avance, semaforo }) {
    if (avance === null) return <span className="text-gray-300 text-xs">Sin datos</span>
    return (
        <div className="flex items-center gap-2 min-w-[110px]">
            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all"
                    style={{
                        width: `${Math.min(100, Math.max(0, avance))}%`,
                        backgroundColor: SEMAFORO_COLOR[semaforo] ?? '#cbd5e1',
                    }}
                />
            </div>
            <span className="text-xs font-semibold text-[#1e3654] tabular-nums w-11 text-right">
                {avance.toFixed(1)}%
            </span>
        </div>
    )
}

function FilaIndicador({ fila, onAbrir }) {
    const tendencia = TENDENCIA[fila.tendencia] ?? TENDENCIA.sin_datos
    const critico = fila.semaforo === 'Rojo' && !fila.tiene_mejora

    return (
        <tr className={`border-b border-gray-50 hover:bg-[#f8fafc] transition-colors ${critico ? 'bg-[#fff5f5]' : ''}`}>
            <td className="px-3 py-2.5">
                <button onClick={() => onAbrir(fila.codigo)} className="text-left group">
                    <span className="font-mono text-xs font-bold text-[#1e3654] group-hover:underline">
                        {fila.codigo}
                    </span>
                    <p className="text-xs text-gray-700 mt-0.5 max-w-[260px]">{fila.indicador}</p>
                    {fila.responsable && (
                        <p className="text-[10px] text-gray-400 mt-0.5">Resp.: {fila.responsable}</p>
                    )}
                </button>
            </td>
            <td className="px-3 py-2.5 text-right text-xs text-gray-500 tabular-nums whitespace-nowrap">
                {formatear(fila.meta_final, fila.unidad)}
            </td>
            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                <span className="text-sm font-semibold text-[#1e3654] tabular-nums">
                    {formatear(fila.valor_actual, fila.unidad)}
                </span>
                {fila.mes_corte && <p className="text-[10px] text-gray-400">a {fila.mes_corte}</p>}
            </td>
            <td className="px-3 py-2.5"><BarraAvance avance={fila.avance} semaforo={fila.semaforo} /></td>
            <td className="px-3 py-2.5"><SemaforoBadge semaforo={fila.semaforo} /></td>
            <td className="px-3 py-2.5">
                <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${tendencia.color}`} title={tendencia.texto}>
                    <span className="material-symbols-outlined text-base">{tendencia.icono}</span>
                    {tendencia.texto}
                </span>
            </td>
            <td className="px-3 py-2.5 text-center text-xs text-gray-500 tabular-nums whitespace-nowrap">
                {fila.meses_evaluados > 0
                    ? `${fila.meses_cumplidos}/${fila.meses_evaluados}`
                    : '—'}
            </td>
            <td className="px-3 py-2.5 text-center">
                {fila.tiene_mejora ? (
                    <span className="material-symbols-outlined text-base text-[#1f7a47]" title="Tiene plan de mejora">
                        check_circle
                    </span>
                ) : fila.semaforo === 'Rojo' ? (
                    <button
                        onClick={() => onAbrir(fila.codigo, 'mejora')}
                        className="text-[10px] font-semibold text-[#9c1d1d] hover:underline whitespace-nowrap"
                        title="Este indicador está en rojo y no tiene plan de mejora"
                    >
                        Sin plan →
                    </button>
                ) : (
                    <span className="text-gray-300 text-xs">—</span>
                )}
            </td>
        </tr>
    )
}

const FILTROS = [
    { clave: 'todos',    texto: 'Todos' },
    { clave: 'Rojo',     texto: 'En rojo' },
    { clave: 'Amarillo', texto: 'En ámbar' },
    { clave: 'Verde',    texto: 'En verde' },
    { clave: 'criticos', texto: 'Críticos sin plan' },
]

export default function TablaMonitoreo({ indicadores }) {
    const navigate = useNavigate()
    const [filtro, setFiltro] = useState('todos')

    const visibles = indicadores.filter((f) => {
        if (filtro === 'todos') return true
        if (filtro === 'criticos') return f.semaforo === 'Rojo' && !f.tiene_mejora
        return f.semaforo === filtro
    })

    function abrir(codigo, destino) {
        navigate(destino === 'mejora' ? `/proceso/${codigo}/mejora` : `/proceso/${codigo}`)
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between gap-3 flex-wrap p-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-[#1e3654]">Monitoreo por indicador</h2>
                <div className="flex flex-wrap gap-1">
                    {FILTROS.map((f) => (
                        <button
                            key={f.clave}
                            onClick={() => setFiltro(f.clave)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                filtro === f.clave
                                    ? 'bg-[#1e3654] text-white'
                                    : 'text-gray-500 hover:bg-gray-100'
                            }`}
                        >
                            {f.texto}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                            <th className="px-3 py-2 font-medium">Proceso / Indicador</th>
                            <th className="px-3 py-2 font-medium text-right">Meta</th>
                            <th className="px-3 py-2 font-medium text-right">Actual</th>
                            <th className="px-3 py-2 font-medium">Avance vs meta</th>
                            <th className="px-3 py-2 font-medium">Semáforo</th>
                            <th className="px-3 py-2 font-medium">Tendencia</th>
                            <th className="px-3 py-2 font-medium text-center" title="Meses en que se cumplió el resultado esperado">
                                Cumpl.
                            </th>
                            <th className="px-3 py-2 font-medium text-center">Mejora</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibles.map((fila) => (
                            <FilaIndicador key={fila.indicador_id} fila={fila} onAbrir={abrir} />
                        ))}
                    </tbody>
                </table>
            </div>

            {visibles.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">
                    No hay indicadores que coincidan con este filtro.
                </p>
            )}
        </div>
    )
}

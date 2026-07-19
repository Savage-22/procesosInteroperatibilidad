import { useState } from 'react'
import { Link } from 'react-router-dom'

import SemaforoBadge from '../../../shared/components/SemaforoBadge'
import { ETAPA_MEJORA, formatear, porcentaje } from '../../tablero/services/tableroService'

/** Antes → después de un indicador intervenido. Solo aparece si hay proyección. */
function Transicion({ indicador }) {
    if (indicador.ganancia_pp === null) return null
    const positiva = indicador.ganancia_pp > 0

    return (
        <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-gray-50">
            <span className="text-[10px] uppercase tracking-wide text-gray-400">Con la mejora</span>
            <span className="text-xs text-gray-500">{formatear(indicador.obtenido)}</span>
            <span className="material-symbols-outlined text-sm text-gray-300">arrow_forward</span>
            <span className="text-xs font-semibold text-[#1e3654]">{formatear(indicador.proyectado)}</span>
            <SemaforoBadge semaforo={indicador.semaforo_proyectado} />
            <span className={`text-xs font-bold ${positiva ? 'text-[#1f7a47]' : 'text-[#9c1d1d]'}`}>
                {positiva ? '+' : ''}{indicador.ganancia_pp} pp
            </span>
            {indicador.mes_alcanza_meta && (
                <span className="text-[10px] text-gray-400">alcanza la meta en {indicador.mes_alcanza_meta}</span>
            )}
        </div>
    )
}

function Indicador({ indicador }) {
    return (
        <li className="py-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                    <p className="text-sm text-gray-700">{indicador.nombre}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                        {indicador.mediciones} medición(es)
                        {indicador.mes_corte && ` · corte a ${indicador.mes_corte}`}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">
                        meta {formatear(indicador.meta_final, indicador.unidad)}
                    </span>
                    <span className="text-sm font-semibold text-[#1e3654]">
                        {formatear(indicador.obtenido, indicador.unidad)}
                    </span>
                    <span className="text-xs text-gray-500 tabular-nums">{porcentaje(indicador.avance)}</span>
                    <SemaforoBadge semaforo={indicador.semaforo} />
                </div>
            </div>
            <Transicion indicador={indicador} />
        </li>
    )
}

function Pastilla({ icono, valor, total, texto }) {
    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#f2f4f7] text-[11px] text-gray-600" title={texto}>
            <span className="material-symbols-outlined text-sm text-gray-400">{icono}</span>
            <strong className="text-[#1e3654]">{total === undefined ? valor : `${valor}/${total}`}</strong>
            {texto}
        </span>
    )
}

export default function TarjetaProceso({ proceso }) {
    const [abierto, setAbierto] = useState(false)
    const m = proceso.mejora
    const etapa = ETAPA_MEJORA[m.etapa] ?? ETAPA_MEJORA.sin_iniciar

    return (
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button
                onClick={() => setAbierto((p) => !p)}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-[#f8fafc] transition-colors"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-sm font-bold text-[#1e3654] shrink-0">{proceso.codigo}</span>
                    <span className="text-sm text-gray-700 truncate">{proceso.nombre}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${etapa.color}`}>
                        {etapa.texto}
                    </span>
                    <span className="text-xs text-gray-400">{proceso.indicadores.length} ind.</span>
                    <span className="material-symbols-outlined text-gray-400 text-xl">
                        {abierto ? 'expand_less' : 'expand_more'}
                    </span>
                </div>
            </button>

            {abierto && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                    {/* Resultados de los indicadores */}
                    {proceso.indicadores.length > 0 ? (
                        <ul className="divide-y divide-gray-50">
                            {proceso.indicadores.map((ind) => <Indicador key={ind.id} indicador={ind} />)}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-400">Este proceso no tiene indicadores medidos.</p>
                    )}

                    {/* Trabajo de mejora */}
                    <div className="flex flex-wrap gap-1.5">
                        <Pastilla icono="hub" valor={m.causas} texto="causas" />
                        <Pastilla icono="target" valor={m.causas_raiz} texto="raíz" />
                        <Pastilla icono="lightbulb" valor={m.implementadas} total={m.oportunidades} texto="oportunidades" />
                        <Pastilla icono="published_with_changes" valor={m.acciones_hechas} total={m.acciones} texto="acciones" />
                        {m.acciones > 0 && <Pastilla icono="donut_large" valor={`${m.avance_cambio}%`} texto="del cambio" />}
                    </div>

                    {proceso.causas_raiz.length > 0 && (
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                                Causas raíz identificadas
                            </p>
                            <ul className="space-y-1">
                                {proceso.causas_raiz.map((c, i) => (
                                    <li key={i} className="flex gap-2 text-xs text-gray-600">
                                        <span className="material-symbols-outlined text-sm text-[#9c1d1d] shrink-0">target</span>
                                        {c}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {proceso.acciones_implementadas.length > 0 && (
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                                Mejoras implementadas
                            </p>
                            <ul className="space-y-1">
                                {proceso.acciones_implementadas.map((a, i) => (
                                    <li key={i} className="flex gap-2 text-xs text-gray-600">
                                        <span className="material-symbols-outlined text-sm text-[#1f7a47] shrink-0">check_circle</span>
                                        <span>
                                            {a.descripcion}
                                            {a.accion && <span className="text-gray-400"> — {a.accion}</span>}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                        <Link
                            to={`/proceso/${proceso.codigo}/mejora`}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56]"
                        >
                            <span className="material-symbols-outlined text-sm">construction</span>
                            Módulo de mejora
                        </Link>
                        <Link
                            to={`/anexos?anexo=4&proceso=${proceso.codigo}`}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[#1e3654] border border-gray-200 hover:bg-gray-50"
                        >
                            <span className="material-symbols-outlined text-sm">description</span>
                            Ver Anexo 4
                        </Link>
                    </div>
                </div>
            )}
        </article>
    )
}

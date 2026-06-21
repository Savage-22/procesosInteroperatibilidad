import SemaforoBadge from '../../../shared/components/SemaforoBadge'

const COLOR_SEMAFORO = {
    Verde:     { bar: 'bg-[#1f7a47]', ring: 'ring-[#1f7a47]/30', bg: 'bg-[#d1fadf]', text: 'text-[#1f7a47]' },
    Amarillo:  { bar: 'bg-[#f4d100]', ring: 'ring-[#f4d100]/40', bg: 'bg-[#fef9c3]', text: 'text-[#854d0e]' },
    Rojo:      { bar: 'bg-[#9c1d1d]', ring: 'ring-[#9c1d1d]/30', bg: 'bg-[#ffe8e8]', text: 'text-[#9c1d1d]' },
    'Sin datos': { bar: 'bg-gray-300', ring: 'ring-gray-200',     bg: 'bg-gray-50',   text: 'text-gray-500'  },
}

function BarraProgreso({ avance, semaforo }) {
    const pct = Math.min(avance ?? 0, 100)
    const col = COLOR_SEMAFORO[semaforo] ?? COLOR_SEMAFORO['Sin datos']
    return (
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
                className={`h-2 rounded-full transition-all duration-500 ${col.bar}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    )
}

function TarjetaModulo({ modulo, avance_ponderado, semaforo, total_procesos, en_riesgo }) {
    const col = COLOR_SEMAFORO[semaforo] ?? COLOR_SEMAFORO['Sin datos']
    return (
        <div className={`rounded-xl p-4 ring-2 ${col.ring} ${col.bg} flex flex-col gap-2`}>
            <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#1e3654]">{modulo}</span>
                <SemaforoBadge semaforo={semaforo} />
            </div>

            <p className={`text-2xl font-bold ${col.text}`}>
                {avance_ponderado != null ? `${avance_ponderado}%` : '—'}
            </p>

            <BarraProgreso avance={avance_ponderado} semaforo={semaforo} />

            <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                <span>{total_procesos} proceso{total_procesos !== 1 ? 's' : ''}</span>
                {en_riesgo > 0 && (
                    <span className="flex items-center gap-0.5 text-[#9c1d1d] font-semibold">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        {en_riesgo} en riesgo
                    </span>
                )}
            </div>
        </div>
    )
}

export default function ResumenGestion({ resumen }) {
    if (!resumen) return null

    const { puntaje_global, semaforo_global, por_modulo, total_en_riesgo } = resumen
    const col = COLOR_SEMAFORO[semaforo_global] ?? COLOR_SEMAFORO['Sin datos']

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-base font-semibold text-[#1e3654]">Resumen de gestión institucional</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Avance T1 ponderado por relevancia — todos los módulos
                    </p>
                </div>
                {total_en_riesgo > 0 && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-[#9c1d1d] bg-[#ffe8e8] px-2.5 py-1 rounded-full">
                        <span className="material-symbols-outlined text-sm">trending_down</span>
                        {total_en_riesgo} proceso{total_en_riesgo !== 1 ? 's' : ''} no alcanzará{total_en_riesgo !== 1 ? 'n' : ''} la meta anual
                    </span>
                )}
            </div>

            {/* Puntaje global */}
            <div className="flex items-center gap-4">
                <div className={`shrink-0 w-16 h-16 rounded-full flex items-center justify-center ring-4 ${col.ring} ${col.bg}`}>
                    <span className={`text-lg font-bold ${col.text}`}>
                        {puntaje_global != null ? `${puntaje_global}%` : '—'}
                    </span>
                </div>
                <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Puntaje institucional global</span>
                        <SemaforoBadge semaforo={semaforo_global} />
                    </div>
                    <BarraProgreso avance={puntaje_global} semaforo={semaforo_global} />
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>0%</span>
                        <span className="text-[#854d0e]">75% ↑ Amarillo</span>
                        <span className="text-[#1f7a47]">95% ↑ Verde</span>
                        <span>100%</span>
                    </div>
                </div>
            </div>

            {/* Tarjetas por módulo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {por_modulo.map((m) => (
                    <TarjetaModulo key={m.modulo} {...m} />
                ))}
            </div>
        </div>
    )
}

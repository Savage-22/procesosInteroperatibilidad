export default function MejoraBadge({ mejora, unidad = '%' }) {
    if (!mejora) return <span className="text-gray-400 text-xs">—</span>

    const { mejora_absoluta, es_mejora } = mejora
    const signo = mejora_absoluta > 0 ? '+' : ''
    const icono = es_mejora ? 'trending_up' : 'trending_down'
    const color = es_mejora ? 'text-[#1f7a47]' : 'text-[#9c1d1d]'

    return (
        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
            <span className="material-symbols-outlined text-sm">{icono}</span>
            {signo}{mejora_absoluta} {unidad}
        </span>
    )
}

const ESTILOS = {
    1: { bg: 'bg-[#1e3654] text-white', label: 'R1 · Muy relevante' },
    2: { bg: 'bg-[#0075ca]/15 text-[#0075ca]', label: 'R2 · Relevante' },
    3: { bg: 'bg-gray-100 text-gray-500', label: 'R3 · Menos relevante' },
}

export default function RelevanciaBadge({ relevancia, ponderador, compacto = false }) {
    const r = relevancia ?? 1
    const { bg, label } = ESTILOS[r] ?? ESTILOS[1]

    if (compacto) {
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bg}`} title={label}>
                R{r}
            </span>
        )
    }

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bg}`}>{label}</span>
            {ponderador !== undefined && (
                <span className="text-xs text-gray-400">({(ponderador * 100).toFixed(0)}%)</span>
            )}
        </div>
    )
}

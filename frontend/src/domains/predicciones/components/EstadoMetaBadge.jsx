const ESTADOS = {
    en_camino: { texto: 'En camino', clase: 'bg-[#e3f3e9] text-[#1f7a47]', icono: 'check_circle' },
    en_riesgo: { texto: 'En riesgo', clase: 'bg-[#ffe8e8] text-[#9c1d1d]', icono: 'warning' },
    sin_datos: { texto: 'Sin proyección', clase: 'bg-gray-100 text-gray-500', icono: 'help' },
}

function estadoDePrediccion(prediccion) {
    if (!prediccion) return 'sin_datos'
    return prediccion.alcanzara_meta ? 'en_camino' : 'en_riesgo'
}

export default function EstadoMetaBadge({ prediccion }) {
    const { texto, clase, icono } = ESTADOS[estadoDePrediccion(prediccion)]
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${clase}`}>
            <span className="material-symbols-outlined text-sm">{icono}</span>
            {texto}
        </span>
    )
}

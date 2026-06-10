const COLOR_ICONO = {
    verde: 'text-[#1f7a47]',
    amarillo: 'text-[#854d0e]',
    rojo: 'text-[#9c1d1d]',
    neutro: 'text-[#1e3654]',
}

export default function KpiCard({ label, value, color = 'neutro', icon }) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4 border border-gray-100">
            <span className={`material-symbols-outlined text-4xl ${COLOR_ICONO[color] ?? COLOR_ICONO.neutro}`}>{icon}</span>
            <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-[#1e3654]">{value}</p>
            </div>
        </div>
    )
}

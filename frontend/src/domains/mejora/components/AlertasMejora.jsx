import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { obtenerAlertas, getErrorMessage } from '../services/mejoraService'

const NIVEL = {
    critico: { label: 'Crítico', icon: 'priority_high', color: '#9c1d1d', bg: '#ffe8e8', chip: 'bg-[#9c1d1d] text-white' },
    atencion: { label: 'Atención', icon: 'warning', color: '#854d0e', bg: '#fffbeb', chip: 'bg-[#f4d100] text-[#5c4300]' },
}

function AlertaCard({ alerta, onMejorar }) {
    const n = NIVEL[alerta.nivel] || NIVEL.atencion
    return (
        <div className="rounded-lg border p-3 flex items-start gap-3" style={{ backgroundColor: n.bg, borderColor: `${n.color}33` }}>
            <span className="material-symbols-outlined" style={{ color: n.color }}>{n.icon}</span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${n.chip}`}>{n.label}</span>
                    <p className="font-semibold text-[#1e3654] text-sm truncate">{alerta.codigo} — {alerta.nombre}</p>
                </div>
                <p className="text-xs text-gray-600 mt-1">{alerta.motivos.join(' · ')}</p>
                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: n.color }}>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    {alerta.sugerencia.texto}
                </p>
            </div>
            <button
                onClick={() => onMejorar(alerta)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#1f7a47] text-white hover:brightness-95"
            >
                <span className="material-symbols-outlined text-sm">trending_up</span>
                Mejorar
            </button>
        </div>
    )
}

export default function AlertasMejora() {
    const navigate = useNavigate()
    const [datos, setDatos] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        let m = true
        obtenerAlertas().then((d) => m && setDatos(d)).catch((e) => m && setError(getErrorMessage(e)))
        return () => { m = false }
    }, [])

    function mejorar(alerta) {
        navigate(`/proceso/${alerta.codigo}/mejora?tab=${alerta.sugerencia.tab}`)
    }

    if (error || !datos) return null  // no estorbar el dashboard si falla o aún carga

    const { resumen, alertas } = datos

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#1f7a47]">notifications_active</span>
                    <h2 className="text-base font-semibold text-[#1e3654]">Procesos que deberían mejorar</h2>
                </div>
                {resumen.total > 0 && (
                    <p className="text-xs text-gray-500">
                        {resumen.criticos > 0 && <span className="text-[#9c1d1d] font-medium">{resumen.criticos} crítico(s)</span>}
                        {resumen.criticos > 0 && resumen.atencion > 0 && ' · '}
                        {resumen.atencion > 0 && <span className="text-[#854d0e] font-medium">{resumen.atencion} en atención</span>}
                    </p>
                )}
            </div>
            <div className="p-4">
                {alertas.length === 0 ? (
                    <p className="flex items-center justify-center gap-2 text-sm text-[#1f7a47] py-4">
                        <span className="material-symbols-outlined">check_circle</span>
                        Ningún proceso evaluado requiere mejora ahora mismo.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {alertas.map((a) => <AlertaCard key={a.codigo} alerta={a} onMejorar={mejorar} />)}
                    </div>
                )}
            </div>
        </div>
    )
}

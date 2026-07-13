import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import IshikawaTab from '../components/IshikawaTab'
import OportunidadesTab from '../components/OportunidadesTab'
import ComparacionTab from '../components/ComparacionTab'
import CambioTab from '../components/CambioTab'

const TABS = [
    { id: 'ishikawa', label: 'Diagnóstico (Ishikawa)', icon: 'lan' },
    { id: 'oportunidades', label: 'Oportunidades (F=C×I)', icon: 'lightbulb' },
    { id: 'comparacion', label: 'Antes / Después', icon: 'compare_arrows' },
    { id: 'cambio', label: 'Gestión del cambio (Lewin)', icon: 'change_circle' },
]

export default function MejoraPage() {
    const { codigo } = useParams()
    const navigate = useNavigate()
    const [tab, setTab] = useState('ishikawa')

    return (
        <div className="space-y-6">
            <div>
                <button onClick={() => navigate('/inventario')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#1e3654] mb-1">
                    <span className="material-symbols-outlined text-sm">arrow_back</span> Inventario
                </button>
                <h1 className="text-2xl font-bold text-[#1e3654]">Mejora del proceso · <span className="font-mono">{codigo}</span></h1>
                <p className="text-sm text-gray-500 mt-1">Diagnóstico de causas → oportunidades priorizadas → comparación de la mejora lograble.</p>
            </div>

            <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                            tab === t.id ? 'border-[#1e3654] text-[#1e3654]' : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <span className="material-symbols-outlined text-base">{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'ishikawa' && <IshikawaTab codigo={codigo} />}
            {tab === 'oportunidades' && <OportunidadesTab codigo={codigo} />}
            {tab === 'comparacion' && <ComparacionTab codigo={codigo} />}
            {tab === 'cambio' && <CambioTab codigo={codigo} />}
        </div>
    )
}

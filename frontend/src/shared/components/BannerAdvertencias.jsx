import { useState } from 'react'

import { useDatos } from '../hooks/useDatos'

export default function BannerAdvertencias() {
    const { advertencias } = useDatos()
    const [isOculto, setIsOculto] = useState(false)

    if (isOculto || advertencias.length === 0) return null

    return (
        <div className="bg-[#fef9c3] border-b border-[#f4d100]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-start gap-2 text-sm text-[#854d0e]">
                <span className="material-symbols-outlined text-base mt-0.5">warning</span>
                <div className="flex-1">
                    {advertencias.map((adv) => (
                        <p key={adv}>{adv}</p>
                    ))}
                </div>
                <button
                    onClick={() => setIsOculto(true)}
                    className="hover:bg-[#f4d100]/30 rounded p-0.5 transition-colors"
                    aria-label="Cerrar aviso"
                >
                    <span className="material-symbols-outlined text-base">close</span>
                </button>
            </div>
        </div>
    )
}

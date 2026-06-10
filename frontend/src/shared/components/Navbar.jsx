import { useState } from 'react'
import { NavLink } from 'react-router-dom'

import { useDatos } from '../hooks/useDatos'
import BotonCargarExcel from './BotonCargarExcel'

const LINKS = [
    { to: '/', label: 'Dashboard', icon: 'dashboard' },
    { to: '/comparativa', label: 'Comparativa', icon: 'compare_arrows' },
    { to: '/pareto', label: 'Pareto', icon: 'bar_chart' },
]

function formatearHora(iso) {
    if (!iso) return null
    const fecha = new Date(iso)
    if (isNaN(fecha)) return null
    return fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

function NavLinks({ onNavigate }) {
    return LINKS.map(({ to, label, icon }) => (
        <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                        ? 'bg-[#f4d100] text-[#1e3654]'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                }`
            }
        >
            <span className="material-symbols-outlined text-base">{icon}</span>
            {label}
        </NavLink>
    ))
}

export default function Navbar() {
    const { ultimaCarga } = useDatos()
    const [isMenuAbierto, setIsMenuAbierto] = useState(false)
    const hora = formatearHora(ultimaCarga)

    return (
        <nav className="bg-[#1e3654] shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#f4d100] text-2xl">monitoring</span>
                        <div>
                            <p className="text-white font-bold text-sm leading-tight">Dashboard CEPLAN</p>
                            <p className="text-[#f4d100] text-xs leading-tight">Directiva N° 0056-2024</p>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-1">
                        <NavLinks />
                        <BotonCargarExcel />
                        {hora && (
                            <span className="flex items-center gap-1 ml-3 text-xs text-white/50" title="Última actualización de datos">
                                <span className="material-symbols-outlined text-sm">sync</span>
                                {hora}
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => setIsMenuAbierto((prev) => !prev)}
                        className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                        aria-label="Abrir menú"
                    >
                        <span className="material-symbols-outlined">{isMenuAbierto ? 'close' : 'menu'}</span>
                    </button>
                </div>

                {isMenuAbierto && (
                    <div className="md:hidden pb-3 flex flex-col gap-1">
                        <NavLinks onNavigate={() => setIsMenuAbierto(false)} />
                        <BotonCargarExcel />
                        {hora && (
                            <span className="flex items-center gap-1 px-3 py-1 text-xs text-white/50">
                                <span className="material-symbols-outlined text-sm">sync</span>
                                Datos actualizados a las {hora}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </nav>
    )
}

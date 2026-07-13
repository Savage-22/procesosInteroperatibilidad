import { useState } from 'react'
import { NavLink } from 'react-router-dom'

import { useDatos } from '../hooks/useDatos'
import BotonCargarExcel from './BotonCargarExcel'
import BotonPlantilla from './BotonPlantilla'

// label: texto en móvil — short: texto en desktop (más corto para que quepa)
const LINKS = [
    { to: '/',             label: 'Dashboard',    short: 'Dashboard',  icon: 'dashboard'      },
    { to: '/onboarding',   label: 'Empezar de 0', short: 'Asistente',  icon: 'rocket_launch'  },
    { to: '/hoja-de-ruta', label: 'Hoja de Ruta', short: 'Guía',       icon: 'route'          },
    { to: '/inventario',   label: 'Inventario',   short: 'Inventario', icon: 'account_tree'   },
    { to: '/objetivos',    label: 'Objetivos',    short: 'Objetivos',  icon: 'flag'           },
    { to: '/comparativa',  label: 'Comparativa',  short: 'Comparativa',icon: 'compare_arrows' },
    { to: '/pareto',       label: 'Pareto',        short: 'Pareto',     icon: 'bar_chart'      },
    { to: '/predicciones', label: 'Predicciones', short: 'Predicción', icon: 'insights'       },
    { to: '/metodologia',  label: 'Metodología',  short: 'Metodología',icon: 'menu_book'      },
]

function formatearHora(iso) {
    if (!iso) return null
    const fecha = new Date(iso)
    if (isNaN(fecha)) return null
    return fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

/* ── Desktop: icono + label corto ──────────────────────────────── */
function NavLinksDesktop() {
    return LINKS.map(({ to, label, short, icon }) => (
        <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            className={({ isActive }) =>
                `flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                        ? 'bg-[#f4d100] text-[#1e3654]'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                }`
            }
        >
            <span className="material-symbols-outlined text-base">{icon}</span>
            {short}
        </NavLink>
    ))
}

/* ── Móvil: icono + label completo ─────────────────────────────── */
function NavLinksMobile({ onNavigate }) {
    return LINKS.map(({ to, label, icon }) => (
        <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                        ? 'bg-[#f4d100] text-[#1e3654]'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                }`
            }
        >
            <span className="material-symbols-outlined text-xl">{icon}</span>
            {label}
        </NavLink>
    ))
}

export default function Navbar() {
    const { ultimaCarga, procesosEnRojo } = useDatos()
    const [menuAbierto, setMenuAbierto] = useState(false)
    const hora = formatearHora(ultimaCarga)
    const cerrar = () => setMenuAbierto(false)

    return (
        <nav className="bg-[#1e3654] shadow-lg relative z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* ── Barra principal ─────────────────────────────── */}
                <div className="flex items-center justify-between h-16 gap-3">

                    {/* Logo */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="material-symbols-outlined text-[#f4d100] text-2xl">monitoring</span>
                        <div>
                            <p className="text-white font-bold text-sm leading-tight">SIIP</p>
                            <p className="text-[#f4d100] text-[10px] leading-tight hidden sm:block">
                                Interoperabilidad · CEPLAN N° 0056-2024
                            </p>
                            <p className="text-[#f4d100] text-[10px] leading-tight sm:hidden">
                                CEPLAN N° 0056-2024
                            </p>
                        </div>
                    </div>

                    {/* Links + acciones — desktop */}
                    <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
                        <NavLinksDesktop />
                        <BotonCargarExcel iconOnly />
                        <BotonPlantilla iconOnly />
                    </div>

                    {/* Derecha desktop: alerta + hora */}
                    <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
                        {procesosEnRojo > 0 && (
                            <span
                                title={`${procesosEnRojo} proceso${procesosEnRojo > 1 ? 's' : ''} en estado crítico`}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#9c1d1d] text-white text-xs font-bold animate-pulse"
                            >
                                <span className="material-symbols-outlined text-sm">warning</span>
                                {procesosEnRojo}
                            </span>
                        )}
                        {hora && (
                            <span className="flex items-center gap-1 text-xs text-white/40" title="Última actualización">
                                <span className="material-symbols-outlined text-sm">sync</span>
                                {hora}
                            </span>
                        )}
                    </div>

                    {/* Derecha móvil: alerta + hamburger */}
                    <div className="flex lg:hidden items-center gap-2">
                        {procesosEnRojo > 0 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#9c1d1d] text-white text-xs font-bold animate-pulse">
                                <span className="material-symbols-outlined text-sm">warning</span>
                                {procesosEnRojo}
                            </span>
                        )}
                        <button
                            onClick={() => setMenuAbierto(prev => !prev)}
                            className="text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
                        >
                            <span className="material-symbols-outlined text-2xl">
                                {menuAbierto ? 'close' : 'menu'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Panel móvil ─────────────────────────────────────── */}
            {menuAbierto && (
                <div className="lg:hidden bg-[#1a2f4a] border-t border-white/10 px-4 py-3 flex flex-col gap-1">

                    <NavLinksMobile onNavigate={cerrar} />

                    {/* Separador */}
                    <div className="h-px bg-white/10 my-2" />

                    {/* Acciones */}
                    <div className="flex gap-2 px-1">
                        <div className="flex-1" onClick={cerrar}><BotonCargarExcel /></div>
                        <div className="flex-1" onClick={cerrar}><BotonPlantilla /></div>
                    </div>

                    {/* Info de última actualización */}
                    {hora && (
                        <p className="flex items-center gap-1.5 px-1 pt-2 text-xs text-white/40">
                            <span className="material-symbols-outlined text-sm">sync</span>
                            Datos al {hora}
                        </p>
                    )}
                </div>
            )}
        </nav>
    )
}

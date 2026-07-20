import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'

import { useDatos } from '../hooks/useDatos'
import BotonCargarExcel from './BotonCargarExcel'
import BotonPlantilla from './BotonPlantilla'

// label: texto en móvil — short: texto en desktop (más corto para que quepa)
// Con 12 secciones ya no caben todas en la barra: las principales quedan
// visibles y el resto se agrupa bajo "Más". En móvil se listan todas.
const PRINCIPALES = [
    { to: '/',             label: 'Dashboard',          short: 'Dashboard',  icon: 'dashboard'    },
    { to: '/tablero',      label: 'Tablero de control', short: 'Tablero',    icon: 'monitoring'   },
    { to: '/resultados',   label: 'Resultados',         short: 'Resultados', icon: 'analytics'    },
    { to: '/anexos',       label: 'Anexos',             short: 'Anexos',     icon: 'description'  },
    { to: '/bitacora',     label: 'Bitácora',           short: 'Bitácora',   icon: 'route'        },
    { to: '/onboarding',   label: 'Empezar de 0',       short: 'Asistente',  icon: 'rocket_launch'},
]

const SECUNDARIOS = [
    { to: '/inventario',   label: 'Inventario',   short: 'Inventario', icon: 'account_tree'   },
    { to: '/objetivos',    label: 'Objetivos',    short: 'Objetivos',  icon: 'flag'           },
    { to: '/comparativa',  label: 'Comparativa',  short: 'Comparativa',icon: 'compare_arrows' },
    { to: '/pareto',       label: 'Pareto',       short: 'Pareto',     icon: 'bar_chart'      },
    { to: '/predicciones', label: 'Predicciones', short: 'Predicción', icon: 'insights'       },
    { to: '/metodologia',  label: 'Metodología',  short: 'Metodología',icon: 'menu_book'      },
]

const LINKS = [...PRINCIPALES, ...SECUNDARIOS]

function formatearHora(iso) {
    if (!iso) return null
    const fecha = new Date(iso)
    if (isNaN(fecha)) return null
    return fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

const CLASE_LINK = ({ isActive }) =>
    `flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
        isActive ? 'bg-[#f4d100] text-[#1e3654]' : 'text-white/80 hover:text-white hover:bg-white/10'
    }`

/* ── Desktop: principales visibles + resto bajo "Más" ──────────── */
function NavLinksDesktop() {
    const [abierto, setAbierto] = useState(false)
    const contenedor = useRef(null)

    // Cierra el menú al hacer clic fuera de él. Se evita cerrarlo con el `blur`
    // del botón + setTimeout, cuya carrera a veces se tragaba el clic en un
    // enlace y hacía que "no llevara a ningún lado".
    useEffect(() => {
        if (!abierto) return
        function alClicarFuera(e) {
            if (contenedor.current && !contenedor.current.contains(e.target)) {
                setAbierto(false)
            }
        }
        document.addEventListener('mousedown', alClicarFuera)
        return () => document.removeEventListener('mousedown', alClicarFuera)
    }, [abierto])

    return (
        <>
            {PRINCIPALES.map(({ to, label, short, icon }) => (
                <NavLink key={to} to={to} end={to === '/'} title={label} className={CLASE_LINK}>
                    <span className="material-symbols-outlined text-base">{icon}</span>
                    {short}
                </NavLink>
            ))}

            <div className="relative" ref={contenedor}>
                <button
                    onClick={() => setAbierto((p) => !p)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap"
                >
                    <span className="material-symbols-outlined text-base">more_horiz</span>
                    Más
                </button>

                {abierto && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-[#1a2f4a] rounded-xl shadow-xl border border-white/10 p-1.5 flex flex-col gap-0.5 z-50">
                        {SECUNDARIOS.map(({ to, label, icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                onClick={() => setAbierto(false)}
                                className={({ isActive }) =>
                                    `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                        isActive
                                            ? 'bg-[#f4d100] text-[#1e3654]'
                                            : 'text-white/80 hover:text-white hover:bg-white/10'
                                    }`
                                }
                            >
                                <span className="material-symbols-outlined text-base">{icon}</span>
                                {label}
                            </NavLink>
                        ))}
                    </div>
                )}
            </div>
        </>
    )
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

    // La barra queda fija al hacer scroll: las vistas de datos son largas y
    // bajar a leer una tabla no debe costar volver arriba para cambiar de
    // sección. `no-print` la saca de los PDF de anexos y bitácora.
    return (
        <nav className="bg-[#1e3654] shadow-lg sticky top-0 z-40 no-print">
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
            {/* Con la barra fija el panel no puede crecer más que la pantalla:
                las 12 secciones no caben y quedarían fuera de alcance. */}
            {menuAbierto && (
                <div className="lg:hidden bg-[#1a2f4a] border-t border-white/10 px-4 py-3 flex flex-col gap-1 max-h-[calc(100vh-4rem)] overflow-y-auto">

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

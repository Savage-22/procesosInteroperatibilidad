import { NavLink } from 'react-router-dom'

const LINKS = [
    { to: '/', label: 'Dashboard', icon: 'dashboard' },
    { to: '/comparativa', label: 'Comparativa', icon: 'compare_arrows' },
    { to: '/pareto', label: 'Pareto', icon: 'bar_chart' },
]

export default function Navbar() {
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
                    <div className="flex items-center gap-1">
                        {LINKS.map(({ to, label, icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={to === '/'}
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
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    )
}

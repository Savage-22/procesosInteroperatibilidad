import { Link } from 'react-router-dom'

export default function NotFoundPage() {
    return (
        <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300">search_off</span>
            <div>
                <h1 className="text-3xl font-bold text-[#1e3654]">404</h1>
                <p className="text-gray-500 mt-1">La página que buscas no existe</p>
            </div>
            <Link
                to="/"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1e3654] text-white text-sm font-medium hover:bg-[#0c2f56] transition-colors"
            >
                <span className="material-symbols-outlined text-base">dashboard</span>
                Ir al dashboard
            </Link>
        </div>
    )
}

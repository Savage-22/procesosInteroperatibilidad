import { Component } from 'react'

// Clase porque React solo soporta componentDidCatch en componentes de clase
export default class ErrorBoundary extends Component {
    state = { hasError: false }

    static getDerivedStateFromError() {
        return { hasError: true }
    }

    componentDidCatch(error, info) {
        console.error('Error de render no controlado:', error, info)
    }

    render() {
        if (!this.state.hasError) return this.props.children

        return (
            <div className="min-h-screen bg-[#f2f4f7] flex flex-col items-center justify-center gap-4 text-center px-4">
                <span className="material-symbols-outlined text-6xl text-[#9c1d1d]">report</span>
                <div>
                    <h1 className="text-xl font-bold text-[#1e3654]">Algo salió mal</h1>
                    <p className="text-gray-500 mt-1">Ocurrió un error inesperado al mostrar la página</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1e3654] text-white text-sm font-medium hover:bg-[#0c2f56] transition-colors"
                >
                    <span className="material-symbols-outlined text-base">refresh</span>
                    Recargar la página
                </button>
            </div>
        )
    }
}

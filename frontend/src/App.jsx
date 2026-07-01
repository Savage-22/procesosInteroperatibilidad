import { BrowserRouter, Routes, Route } from 'react-router-dom'

import ChatWidget from './shared/components/ChatWidget'
import ErrorBoundary from './shared/components/ErrorBoundary'
import Navbar from './shared/components/Navbar'
import BannerAdvertencias from './shared/components/BannerAdvertencias'
import NotFoundPage from './shared/components/NotFoundPage'
import { DatosProvider } from './shared/context/DatosContext'
import DashboardPage from './domains/dashboard/pages/DashboardPage'
import HojaDeRutaPage from './domains/hojaruta/pages/HojaDeRutaPage'
import ProcesoDetallePage from './domains/procesos/pages/ProcesoDetallePage'
import ComparativaPage from './domains/comparativa/pages/ComparativaPage'
import ParetoPage from './domains/pareto/pages/ParetoPage'
import PrediccionesPage from './domains/predicciones/pages/PrediccionesPage'
import MetodologiaPage from './domains/metodologia/pages/MetodologiaPage'
import ObjetivosPage from './domains/objetivos/pages/ObjetivosPage'

export default function App() {
    return (
        <ErrorBoundary>
            <DatosProvider>
                <BrowserRouter>
                    <div className="min-h-screen bg-[#f2f4f7]">
                        <Navbar />
                        <BannerAdvertencias />
                        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                            <Routes>
                                <Route path="/" element={<DashboardPage />} />
                                <Route path="/proceso/:codigo" element={<ProcesoDetallePage />} />
                                <Route path="/comparativa" element={<ComparativaPage />} />
                                <Route path="/pareto" element={<ParetoPage />} />
                                <Route path="/predicciones" element={<PrediccionesPage />} />
                                <Route path="/metodologia" element={<MetodologiaPage />} />
                                <Route path="/objetivos" element={<ObjetivosPage />} />
                                <Route path="/hoja-de-ruta" element={<HojaDeRutaPage />} />
                                <Route path="*" element={<NotFoundPage />} />
                            </Routes>
                        </main>
                        <ChatWidget />
                    </div>
                </BrowserRouter>
            </DatosProvider>
        </ErrorBoundary>
    )
}

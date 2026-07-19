import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import ChatWidget from './shared/components/ChatWidget'
import ErrorBoundary from './shared/components/ErrorBoundary'
import Navbar from './shared/components/Navbar'
import BannerAdvertencias from './shared/components/BannerAdvertencias'
import NotFoundPage from './shared/components/NotFoundPage'
import { DatosProvider } from './shared/context/DatosContext'
import DashboardPage from './domains/dashboard/pages/DashboardPage'
import AnexosPage from './domains/anexos/pages/AnexosPage'
import BitacoraPage from './domains/bitacora/pages/BitacoraPage'
import TableroPage from './domains/tablero/pages/TableroPage'
import ResultadosPage from './domains/resultados/pages/ResultadosPage'
import ProcesoDetallePage from './domains/procesos/pages/ProcesoDetallePage'
import ComparativaPage from './domains/comparativa/pages/ComparativaPage'
import ParetoPage from './domains/pareto/pages/ParetoPage'
import PrediccionesPage from './domains/predicciones/pages/PrediccionesPage'
import MetodologiaPage from './domains/metodologia/pages/MetodologiaPage'
import ObjetivosPage from './domains/objetivos/pages/ObjetivosPage'
import InventarioPage from './domains/inventario/pages/InventarioPage'
import FichaProcesoPage from './domains/fichas/pages/FichaProcesoPage'
import IndicadoresPage from './domains/fichas/pages/IndicadoresPage'
import OnboardingPage from './domains/onboarding/pages/OnboardingPage'
import MejoraPage from './domains/mejora/pages/MejoraPage'

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
                                <Route path="/tablero" element={<TableroPage />} />
                                <Route path="/resultados" element={<ResultadosPage />} />
                                <Route path="/anexos" element={<AnexosPage />} />
                                <Route path="/proceso/:codigo" element={<ProcesoDetallePage />} />
                                <Route path="/comparativa" element={<ComparativaPage />} />
                                <Route path="/pareto" element={<ParetoPage />} />
                                <Route path="/predicciones" element={<PrediccionesPage />} />
                                <Route path="/metodologia" element={<MetodologiaPage />} />
                                <Route path="/objetivos" element={<ObjetivosPage />} />
                                <Route path="/onboarding" element={<OnboardingPage />} />
                                <Route path="/inventario" element={<InventarioPage />} />
                                <Route path="/proceso/:codigo/ficha" element={<FichaProcesoPage />} />
                                <Route path="/proceso/:codigo/indicadores" element={<IndicadoresPage />} />
                                <Route path="/proceso/:codigo/mejora" element={<MejoraPage />} />
                                <Route path="/bitacora" element={<BitacoraPage />} />
                                {/* La Hoja de Ruta pasó a ser la Bitácora; se redirige para no romper enlaces guardados */}
                                <Route path="/hoja-de-ruta" element={<Navigate to="/bitacora" replace />} />
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

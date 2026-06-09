import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Navbar from './shared/components/Navbar'
import DashboardPage from './domains/dashboard/pages/DashboardPage'
import ProcesoDetallePage from './domains/procesos/pages/ProcesoDetallePage'
import ComparativaPage from './domains/comparativa/pages/ComparativaPage'
import ParetoPage from './domains/pareto/pages/ParetoPage'

export default function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen bg-[#f2f4f7]">
                <Navbar />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/proceso/:codigo" element={<ProcesoDetallePage />} />
                        <Route path="/comparativa" element={<ComparativaPage />} />
                        <Route path="/pareto" element={<ParetoPage />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    )
}

import { BrowserRouter, Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div className="p-8 text-2xl font-bold text-[#1e3654]">Dashboard — en construcción</div>} />
        <Route path="/proceso/:codigo" element={<div className="p-8">Detalle de proceso</div>} />
        <Route path="/comparativa" element={<div className="p-8">Comparativa</div>} />
        <Route path="/pareto" element={<div className="p-8">Pareto</div>} />
      </Routes>
    </BrowserRouter>
  )
}

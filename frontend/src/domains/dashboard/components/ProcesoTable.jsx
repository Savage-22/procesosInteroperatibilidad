import { useState, useMemo } from 'react'

import SemaforoBadge from '../../../shared/components/SemaforoBadge'

const COLUMNAS = [
    { campo: 'codigo', label: 'Código' },
    { campo: 'proceso', label: 'Proceso' },
    { campo: 'modulo', label: 'Módulo' },
    { campo: 'meta_final', label: 'Meta final' },
    { campo: 'promedio_resultado_obtenido', label: 'Prom. Obtenido' },
    { campo: 'promedio_avance_t1', label: 'Avance T1' },
    { campo: 'brecha', label: 'Brecha' },
    { campo: 'semaforo', label: 'Semáforo' },
]

function compararPor(campo, asc) {
    return (a, b) => {
        const va = a[campo]
        const vb = b[campo]
        if (va === null || va === undefined) return 1
        if (vb === null || vb === undefined) return -1
        const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
        return asc ? cmp : -cmp
    }
}

export default function ProcesoTable({ procesos, onRowClick }) {
    const [orden, setOrden] = useState({ campo: 'codigo', asc: true })

    const procesosOrdenados = useMemo(
        () => [...procesos].sort(compararPor(orden.campo, orden.asc)),
        [procesos, orden],
    )

    function handleSort(campo) {
        setOrden((prev) => ({
            campo,
            asc: prev.campo === campo ? !prev.asc : true,
        }))
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-[#f2f4f7] text-gray-600 text-xs uppercase tracking-wide">
                    <tr>
                        {COLUMNAS.map(({ campo, label }) => (
                            <th
                                key={campo}
                                onClick={() => handleSort(campo)}
                                className="px-4 py-3 text-left font-medium cursor-pointer select-none hover:text-[#1e3654]"
                            >
                                <span className="flex items-center gap-1">
                                    {label}
                                    {orden.campo === campo && (
                                        <span className="material-symbols-outlined text-sm">
                                            {orden.asc ? 'arrow_upward' : 'arrow_downward'}
                                        </span>
                                    )}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {procesosOrdenados.map((p) => (
                        <tr
                            key={p.codigo}
                            onClick={() => onRowClick(p.codigo)}
                            className="hover:bg-[#f2f4f7] cursor-pointer transition-colors"
                        >
                            <td className="px-4 py-3 font-mono font-semibold text-[#1e3654]">{p.codigo}</td>
                            <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{p.proceso}</td>
                            <td className="px-4 py-3 text-gray-500">{p.modulo}</td>
                            <td className="px-4 py-3 text-gray-600">{p.meta_final}{p.es_descendente ? ' días' : '%'}</td>
                            <td className="px-4 py-3 text-gray-600">{p.promedio_resultado_obtenido?.toFixed(1)}</td>
                            <td className="px-4 py-3 font-medium text-[#1e3654]">{p.promedio_avance_t1?.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-gray-600">{p.brecha?.toFixed(1)}</td>
                            <td className="px-4 py-3"><SemaforoBadge semaforo={p.semaforo} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

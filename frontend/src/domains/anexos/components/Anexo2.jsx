import { Link } from 'react-router-dom'

import HojaAnexo from './HojaAnexo'

const COLUMNAS_SIPOC = [
    ['proveedores', 'Proveedores', 'S'],
    ['entradas',    'Entradas',    'I'],
    ['salidas',     'Salidas',     'O'],
    ['receptores',  'Clientes',    'C'],
]

function Campo({ etiqueta, valor, ancho = '' }) {
    return (
        <div className={`border border-gray-200 ${ancho}`}>
            <p className="px-2 py-1 bg-[#f2f4f7] text-[10px] font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200">
                {etiqueta}
            </p>
            <p className="px-2 py-1.5 text-xs text-gray-700">{valor || '—'}</p>
        </div>
    )
}

function Lista({ titulo, icono, items, vacio }) {
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <p className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f2f4f7] text-[11px] font-semibold uppercase tracking-wide text-[#1e3654]">
                <span className="material-symbols-outlined text-sm">{icono}</span>{titulo}
            </p>
            {items.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-400 italic">{vacio}</p>
            ) : (
                <ol className="divide-y divide-gray-50">
                    {items.map((item, i) => (
                        <li key={i} className="flex gap-2 px-3 py-1.5 text-xs text-gray-700">
                            <span className="text-gray-300 font-mono shrink-0">{String(i + 1).padStart(2, '0')}</span>
                            {item}
                        </li>
                    ))}
                </ol>
            )}
        </div>
    )
}

export default function Anexo2({ anexo }) {
    const p = anexo.proceso
    const firmas = [
        ['Elaborado por', anexo.firmas.elaborado_por],
        ['Revisado por', anexo.firmas.revisado_por],
        ['Aprobado por', anexo.firmas.aprobado_por],
    ]

    const pie = (
        <footer className="px-5 pt-2 pb-5 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-4">
                {firmas.map(([etiqueta, nombre]) => (
                    <div key={etiqueta} className="text-center">
                        <div className="h-10" />
                        <div className="border-t border-gray-400 pt-1">
                            <p className="text-[11px] font-medium text-gray-700">{nombre || ' '}</p>
                            <p className="text-[10px] text-gray-400">{etiqueta}</p>
                        </div>
                    </div>
                ))}
            </div>
        </footer>
    )

    return (
        <HojaAnexo anexo={anexo} pie={pie}>
            {!anexo.tiene_ficha && (
                <div className="flex items-center gap-2 flex-wrap text-xs text-[#854d0e] bg-[#fef9c3] rounded-lg px-3 py-2 no-print">
                    <span className="material-symbols-outlined text-base">info</span>
                    <span>
                        Este proceso aún no tiene ficha SIPOC completada; el anexo se emite con los campos vacíos.
                    </span>
                    <Link
                        to={`/proceso/${p.codigo}/ficha`}
                        className="ml-auto inline-flex items-center gap-1 font-semibold text-[#1e3654] hover:underline"
                    >
                        Completar ficha (con ayuda de IA)
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                </div>
            )}

            {/* Identificación */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 -space-x-px">
                <Campo etiqueta="Código" valor={p.codigo} />
                <Campo etiqueta="Tipo de proceso" valor={p.tipo} />
                <Campo etiqueta="Dueño del proceso" valor={p.dueno} />
                <Campo etiqueta="Producto" valor={p.producto} />
            </div>
            <div className="grid grid-cols-1 gap-0 -space-y-px">
                <Campo etiqueta="Denominación del proceso" valor={p.nombre} />
                <Campo etiqueta="Objetivo del proceso" valor={p.objetivo} />
                <Campo etiqueta="Objetivo estratégico al que aporta" valor={p.objetivo_estrategico} />
            </div>

            {/* SIPOC */}
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#1e3654] mb-1.5">
                    Caracterización SIPOC
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="bg-[#1e3654] text-white">
                                {COLUMNAS_SIPOC.map(([clave, titulo, letra]) => (
                                    <th key={clave} className="px-2 py-2 text-left font-semibold border-r border-white/10 last:border-0">
                                        <span className="text-[#f4d100] font-mono mr-1">{letra}</span>{titulo}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {anexo.sipoc.map((fila, i) => (
                                <tr key={i} className="border-b border-gray-100 even:bg-[#f8fafc]">
                                    {COLUMNAS_SIPOC.map(([clave]) => (
                                        <td key={clave} className="px-2 py-1.5 text-gray-700 align-top border-r border-gray-100 last:border-0">
                                            {fila[clave] || <span className="text-gray-300">—</span>}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
                <Lista titulo="Actividades (P-D-C-A)" icono="checklist" items={anexo.actividades} vacio="Sin actividades registradas" />
                <Lista titulo="Riesgos" icono="report" items={anexo.riesgos} vacio="Sin riesgos registrados" />
                <Lista titulo="Registros" icono="folder" items={anexo.registros} vacio="Sin registros declarados" />
            </div>
        </HojaAnexo>
    )
}

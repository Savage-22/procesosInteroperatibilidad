import HojaAnexo from './HojaAnexo'

const NIVEL_COLOR = [
    'bg-[#1e3654] text-white',
    'bg-[#dbeafe] text-[#1e40af]',
    'bg-[#e0e7ff] text-[#4338ca]',
    'bg-gray-100 text-gray-600',
]

export default function Anexo1({ anexo }) {
    return (
        <HojaAnexo anexo={anexo}>
            <div className="flex flex-wrap gap-3">
                {Object.entries(anexo.totales.por_nivel).map(([nivel, cantidad]) => (
                    <div key={nivel} className="flex-1 min-w-[120px] bg-[#f2f4f7] rounded-lg px-3 py-2">
                        <p className="text-xl font-bold text-[#1e3654]">{cantidad}</p>
                        <p className="text-[11px] text-gray-500">{nivel}(s)</p>
                    </div>
                ))}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="bg-[#1e3654] text-white text-left">
                            <th className="px-2 py-2 font-semibold">Código</th>
                            <th className="px-2 py-2 font-semibold">Nivel</th>
                            <th className="px-2 py-2 font-semibold">Denominación del proceso</th>
                            <th className="px-2 py-2 font-semibold">Producto</th>
                            <th className="px-2 py-2 font-semibold">Base legal</th>
                            <th className="px-2 py-2 font-semibold text-center">Ind.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {anexo.filas.map((fila) => (
                            <tr key={fila.codigo} className="border-b border-gray-100 even:bg-[#f8fafc]">
                                <td className="px-2 py-1.5">
                                    <span
                                        className="font-mono font-bold text-[#1e3654]"
                                        style={{ paddingLeft: `${fila.nivel * 10}px` }}
                                    >
                                        {fila.codigo}
                                    </span>
                                </td>
                                <td className="px-2 py-1.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${NIVEL_COLOR[fila.nivel] ?? NIVEL_COLOR[3]}`}>
                                        {fila.nivel_etiqueta}
                                    </span>
                                </td>
                                <td className="px-2 py-1.5 text-gray-700">{fila.nombre}</td>
                                <td className="px-2 py-1.5 text-gray-500">{fila.producto}</td>
                                <td className="px-2 py-1.5 text-gray-500">{fila.base_legal}</td>
                                <td className="px-2 py-1.5 text-center text-gray-500">{fila.num_indicadores}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {anexo.filas.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">
                    El inventario está vacío. Agrega procesos para emitir este anexo.
                </p>
            )}
        </HojaAnexo>
    )
}

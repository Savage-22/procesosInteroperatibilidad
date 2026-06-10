export default function ProcesoSelector({ procesos, seleccionados, onSelectionChange }) {
    const modulos = [...new Set(procesos.map((p) => p.modulo))].sort()

    function handleToggle(codigo) {
        const next = new Set(seleccionados)
        next.has(codigo) ? next.delete(codigo) : next.add(codigo)
        onSelectionChange([...next])
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <button
                    onClick={() => onSelectionChange(procesos.map((p) => p.codigo))}
                    className="text-xs px-2 py-1 rounded bg-[#1e3654] text-white hover:bg-[#0c2f56] transition-colors"
                >
                    Todos
                </button>
                <button
                    onClick={() => onSelectionChange([])}
                    className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                    Limpiar
                </button>
            </div>
            {modulos.map((mod) => (
                <div key={mod}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{mod}</p>
                    {procesos
                        .filter((p) => p.modulo === mod)
                        .map((p) => (
                            <label key={p.codigo} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1">
                                <input
                                    type="checkbox"
                                    checked={seleccionados.has(p.codigo)}
                                    onChange={() => handleToggle(p.codigo)}
                                    className="rounded"
                                />
                                <span
                                    className="w-3 h-3 rounded-full shrink-0"
                                    style={{ backgroundColor: p.color_hex }}
                                />
                                <span className="text-sm text-gray-700">{p.codigo}</span>
                            </label>
                        ))}
                </div>
            ))}
        </div>
    )
}

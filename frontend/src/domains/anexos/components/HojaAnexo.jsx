import { formatearFecha } from '../services/anexosService'

/**
 * Marco del documento: encabezado institucional, cuerpo y pie de firma.
 *
 * Lleva ancho fijo tipo A4 y fondo blanco para que lo que se ve en pantalla sea
 * exactamente lo que sale al imprimir o al guardar como PDF.
 */
export default function HojaAnexo({ anexo, children, pie }) {
    const org = anexo.organizacion

    return (
        <article className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden print:border-0 print:shadow-none print:rounded-none">
            {/* Encabezado */}
            <header className="border-b-2 border-[#1e3654]">
                <div className="flex items-stretch">
                    <div className="flex items-center justify-center px-5 py-4 bg-[#1e3654] shrink-0">
                        <span className="material-symbols-outlined text-[#f4d100] text-3xl">monitoring</span>
                    </div>
                    <div className="flex-1 px-5 py-3 min-w-0">
                        <p className="text-[10px] uppercase tracking-widest text-gray-400">{org.directiva}</p>
                        <h2 className="text-base font-bold text-[#1e3654] leading-tight">
                            Anexo {anexo.anexo} — {anexo.titulo}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">{anexo.subtitulo}</p>
                    </div>
                    <div className="px-5 py-3 border-l border-gray-100 text-right shrink-0 hidden sm:block">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Entidad</p>
                        <p className="text-sm font-semibold text-[#1e3654]">{org.nombre}</p>
                        <p className="text-xs text-gray-500">{org.sector}</p>
                        <p className="text-[10px] text-gray-400 mt-1">Emitido: {formatearFecha(org.emitido_el)}</p>
                    </div>
                </div>
                {/* En móvil la entidad va debajo para no romper el encabezado */}
                <div className="sm:hidden px-5 py-2 bg-[#f2f4f7] flex items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold text-[#1e3654] truncate">{org.nombre}</p>
                    <p className="text-[10px] text-gray-400 shrink-0">{formatearFecha(org.emitido_el)}</p>
                </div>
            </header>

            <div className="p-5 space-y-5">{children}</div>

            {pie ?? (
                <footer className="px-5 py-3 border-t border-gray-100 bg-[#f8fafc] flex items-center justify-between gap-2 text-[10px] text-gray-400">
                    <span>{org.directiva} · Anexo {anexo.anexo}</span>
                    <span>{org.nombre}</span>
                </footer>
            )}
        </article>
    )
}

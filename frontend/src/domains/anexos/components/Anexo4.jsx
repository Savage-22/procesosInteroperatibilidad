import SemaforoBadge from '../../../shared/components/SemaforoBadge'
import HojaAnexo from './HojaAnexo'

const RELEVANCIA = { 1: 'Muy relevante', 2: 'Relevante', 3: 'Menos relevante' }

const val = (v, unidad = '') => (v === null || v === undefined ? '—' : `${v}${unidad}`)

function FichaIndicador({ indicador, numero }) {
    const unidad = indicador.unidad === '—' ? '' : indicador.unidad

    const campos = [
        ['Tipo', indicador.tipo],
        ['Sentido', indicador.sentido],
        ['Unidad de medida', indicador.unidad],
        ['Fórmula de cálculo', indicador.formula],
        ['Fuente de datos', indicador.fuente],
        ['Responsable de la medición', indicador.responsable],
        ['Línea base', val(indicador.linea_base, unidad)],
        ['Meta final', val(indicador.meta_final, unidad)],
        ['Relevancia', RELEVANCIA[indicador.relevancia] ?? '—'],
        ['Objetivo estratégico', indicador.objetivo_estrategico],
        ['Acción estratégica', indicador.accion_estrategica],
    ]

    return (
        <section className="border border-gray-200 rounded-lg overflow-hidden break-inside-avoid">
            <header className="flex items-baseline gap-2 px-3 py-2 bg-[#1e3654] text-white">
                <span className="font-mono text-[#f4d100] text-xs">{String(numero).padStart(2, '0')}</span>
                <h3 className="text-sm font-semibold">{indicador.nombre}</h3>
            </header>

            <dl className="grid grid-cols-2 md:grid-cols-3 gap-px bg-gray-200">
                {campos.map(([etiqueta, valor]) => (
                    <div key={etiqueta} className="bg-white px-2 py-1.5">
                        <dt className="text-[10px] uppercase tracking-wide text-gray-400">{etiqueta}</dt>
                        <dd className="text-xs text-gray-700 mt-0.5">{valor || '—'}</dd>
                    </div>
                ))}
            </dl>

            <div className="border-t border-gray-200">
                <p className="px-3 py-1.5 bg-[#f2f4f7] text-[11px] font-semibold uppercase tracking-wide text-[#1e3654]">
                    Mediciones del periodo
                </p>
                {indicador.mediciones.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-400 italic">Sin mediciones capturadas</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="text-left text-gray-500 border-b border-gray-200">
                                    <th className="px-2 py-1.5 font-medium">Mes</th>
                                    <th className="px-2 py-1.5 font-medium text-right">Numerador</th>
                                    <th className="px-2 py-1.5 font-medium text-right">Denominador</th>
                                    <th className="px-2 py-1.5 font-medium text-right">Esperado</th>
                                    <th className="px-2 py-1.5 font-medium text-right">Obtenido</th>
                                    <th className="px-2 py-1.5 font-medium text-right">Avance T1</th>
                                    <th className="px-2 py-1.5 font-medium">Semáforo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {indicador.mediciones.map((m) => (
                                    <tr key={m.id} className="border-b border-gray-50 even:bg-[#f8fafc]">
                                        <td className="px-2 py-1.5 text-gray-700">{m.mes}{m.anio ? ` ${m.anio}` : ''}</td>
                                        <td className="px-2 py-1.5 text-right text-gray-500">{val(m.numerador)}</td>
                                        <td className="px-2 py-1.5 text-right text-gray-500">{val(m.denominador)}</td>
                                        <td className="px-2 py-1.5 text-right text-gray-500">{val(m.resultado_esperado)}</td>
                                        <td className="px-2 py-1.5 text-right font-semibold text-[#1e3654]">{val(m.resultado_obtenido)}</td>
                                        <td className="px-2 py-1.5 text-right text-gray-700">
                                            {m.avance_t1 === null ? '—' : `${m.avance_t1.toFixed(1)}%`}
                                        </td>
                                        <td className="px-2 py-1.5"><SemaforoBadge semaforo={m.semaforo} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    )
}

export default function Anexo4({ anexo }) {
    return (
        <HojaAnexo anexo={anexo}>
            <div className="flex items-baseline gap-2 border-b border-gray-100 pb-2">
                <span className="font-mono font-bold text-[#1e3654]">{anexo.proceso.codigo}</span>
                <span className="text-sm text-gray-700">{anexo.proceso.nombre}</span>
                <span className="ml-auto text-xs text-gray-400">
                    {anexo.indicadores.length} indicador(es)
                </span>
            </div>

            {anexo.indicadores.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                    Este proceso todavía no tiene indicadores definidos.
                </p>
            ) : (
                <div className="space-y-4">
                    {anexo.indicadores.map((ind, i) => (
                        <FichaIndicador key={ind.nombre} indicador={ind} numero={i + 1} />
                    ))}
                </div>
            )}
        </HojaAnexo>
    )
}

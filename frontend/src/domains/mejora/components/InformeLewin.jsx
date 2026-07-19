const ESTADO_TEXTO = { pendiente: 'Pendiente', en_curso: 'En curso', hecho: 'Hecho' }
const ESTADO_COLOR = {
    pendiente: 'bg-gray-100 text-gray-600',
    en_curso: 'bg-[#fffbeb] text-[#b45309]',
    hecho: 'bg-[#ecfdf5] text-[#1f7a47]',
}

const hoy = () =>
    new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })

/**
 * En qué etapa está realmente el proceso: la primera que aún tiene acciones
 * sin terminar. Si no queda ninguna pendiente, el cambio está consolidado.
 */
function etapaActual(etapas, acciones) {
    for (const etapa of etapas) {
        const lista = acciones[etapa] ?? []
        if (lista.some((a) => a.estado !== 'hecho')) return etapa
    }
    return null
}

function TablaAcciones({ acciones }) {
    if (acciones.length === 0) {
        return <p className="text-xs text-gray-400 italic px-3 py-2">Sin acciones registradas en esta etapa.</p>
    }
    return (
        <table className="w-full text-xs border-collapse">
            <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="px-3 py-1.5 font-medium">Acción</th>
                    <th className="px-3 py-1.5 font-medium">Responsable</th>
                    <th className="px-3 py-1.5 font-medium">Fecha</th>
                    <th className="px-3 py-1.5 font-medium">Estado</th>
                </tr>
            </thead>
            <tbody>
                {acciones.map((a) => (
                    <tr key={a.id} className="border-b border-gray-50 even:bg-[#f8fafc]">
                        <td className="px-3 py-1.5 text-gray-700">{a.descripcion}</td>
                        <td className="px-3 py-1.5 text-gray-500">{a.responsable || '—'}</td>
                        <td className="px-3 py-1.5 text-gray-500">{a.fecha || '—'}</td>
                        <td className="px-3 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${ESTADO_COLOR[a.estado] ?? ''}`}>
                                {ESTADO_TEXTO[a.estado] ?? a.estado}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

/**
 * Informe imprimible de la gestión del cambio (Kurt Lewin).
 *
 * Reúne en un solo documento las tres etapas con sus acciones, responsables y
 * estado, para entregarlo como evidencia del plan de cambio del proceso.
 */
export default function InformeLewin({ codigo, proceso, datos }) {
    const { etapas, info, acciones, progreso } = datos
    const actual = etapaActual(etapas, acciones)

    return (
        <div className="zona-imprimible bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
            <header className="text-center border-b-2 border-[#1e3654] pb-3">
                <p className="font-bold text-[#1e3654]">
                    INFORME DE GESTIÓN DEL CAMBIO — MODELO DE KURT LEWIN
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                    Proceso <span className="font-mono font-semibold">{codigo}</span>
                    {proceso ? ` · ${proceso}` : ''} · Emitido el {hoy()}
                </p>
            </header>

            {/* Estado general */}
            <section className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-lg bg-[#f2f4f7] p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Acciones del plan</p>
                    <p className="text-xl font-bold text-[#1e3654]">{progreso.total}</p>
                </div>
                <div className="rounded-lg bg-[#f2f4f7] p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Completadas</p>
                    <p className="text-xl font-bold text-[#1f7a47]">
                        {progreso.hechas} <span className="text-sm font-medium text-gray-400">({progreso.porcentaje}%)</span>
                    </p>
                </div>
                <div className="rounded-lg bg-[#f2f4f7] p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Etapa en curso</p>
                    <p className="text-xl font-bold text-[#1e3654]">
                        {actual ? info[actual].titulo : 'Consolidado'}
                    </p>
                </div>
            </section>

            {/* Las tres etapas */}
            {etapas.map((etapa, i) => (
                <section key={etapa} className="break-inside-avoid">
                    <div className="flex items-baseline gap-2 bg-[#1e3654] text-white px-3 py-1.5 rounded-t-lg">
                        <span className="font-mono text-[#f4d100] text-xs">{i + 1}</span>
                        <h3 className="text-sm font-semibold">{info[etapa].titulo}</h3>
                        <span className="ml-auto text-[11px] text-white/70">
                            {(acciones[etapa] ?? []).filter((a) => a.estado === 'hecho').length}
                            {' / '}{(acciones[etapa] ?? []).length} hechas
                        </span>
                    </div>
                    <div className="border border-t-0 border-gray-200 rounded-b-lg">
                        <p className="px-3 pt-2 text-xs text-gray-600">{info[etapa].resumen}</p>
                        <p className="px-3 pb-2 text-[11px] text-gray-400">{info[etapa].detalle}</p>
                        <TablaAcciones acciones={acciones[etapa] ?? []} />
                    </div>
                </section>
            ))}

            <footer className="text-[11px] text-gray-500 border-t border-gray-100 pt-3">
                {actual ? (
                    <>
                        El cambio está en la etapa <strong>{info[actual].titulo}</strong>. Para avanzar,
                        cierra las acciones pendientes de esta etapa antes de pasar a la siguiente:
                        el modelo de Lewin es secuencial y saltarse el descongelamiento es la causa
                        habitual de que la mejora no se sostenga.
                    </>
                ) : progreso.total > 0 ? (
                    <>
                        Todas las acciones están cerradas: el cambio quedó <strong>recongelado</strong>.
                        Valida el resultado en la comparación Antes/Después y mantén el monitoreo del
                        indicador para confirmar que la mejora se sostiene.
                    </>
                ) : (
                    <>Aún no hay acciones registradas en el plan de cambio.</>
                )}
            </footer>
        </div>
    )
}

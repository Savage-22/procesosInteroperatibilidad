import {
    ComposedChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const PrediccionTooltip = ({ active, payload, label, unidad }) => {
    if (!active || !payload?.length) return null
    const visibles = payload.filter((e) => e.value !== null && e.value !== undefined)
    if (!visibles.length) return null
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-md p-3 text-xs">
            <p className="font-semibold text-[#1e3654] mb-1">{label}</p>
            {visibles.map((e) => (
                <p key={e.name} style={{ color: e.color }}>
                    {e.name}: {e.value?.toFixed(1)} {unidad}
                </p>
            ))}
        </div>
    )
}

export default function PrediccionLineChart({ serie, meta, unidad, esDescendente }) {
    // Para días el eje no tiene tope; para porcentajes se fija 0-100
    const dominioY = esDescendente ? ['auto', 'auto'] : [0, 100]

    return (
        <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={serie} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis domain={dominioY} tick={{ fontSize: 11 }} unit={unidad === '%' ? '%' : ''} />
                <Tooltip content={<PrediccionTooltip unidad={unidad} />} />
                <Legend />

                {meta != null && (
                    <ReferenceLine
                        y={meta}
                        stroke="#9c1d1d"
                        strokeDasharray="4 2"
                        label={{ value: `Meta ${meta}`, position: 'insideTopRight', fontSize: 10, fill: '#9c1d1d' }}
                    />
                )}

                <Line
                    type="monotone"
                    dataKey="real"
                    name="Histórico"
                    stroke="#1e3654"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                />
                <Line
                    type="monotone"
                    dataKey="proyectado"
                    name="Proyección"
                    stroke="#f4d100"
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    dot={{ r: 3, fill: '#f4d100' }}
                    connectNulls={false}
                />
            </ComposedChart>
        </ResponsiveContainer>
    )
}

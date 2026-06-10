import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

const ParetoTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-md p-3 text-xs">
            <p className="font-semibold text-[#1e3654] mb-1">{label}</p>
            {payload.map((entry) => (
                <p key={entry.name} style={{ color: entry.color }}>
                    {entry.name}: {entry.value?.toFixed(2)}{entry.name.includes('%') ? '%' : ' pp'}
                </p>
            ))}
        </div>
    )
}

export default function ParetoChart({ items, umbral80 }) {
    return (
        <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={items} margin={{ top: 4, right: 40, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="codigo" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip content={<ParetoTooltip />} />
                <Legend />
                <ReferenceLine yAxisId="right" y={80} stroke="#9c1d1d" strokeDasharray="4 2"
                    label={{ value: '80%', position: 'insideTopRight', fontSize: 10, fill: '#9c1d1d' }} />
                <Bar yAxisId="left" dataKey="brecha_pareto" name="Brecha de avance (pp)" radius={[4, 4, 0, 0]}>
                    {items.map((item, i) => (
                        <Cell
                            key={item.codigo}
                            fill={i <= umbral80 ? '#1e3654' : '#cbd5e1'}
                        />
                    ))}
                </Bar>
                <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="porcentaje_acumulado"
                    name="% acumulado"
                    stroke="#f4d100"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#f4d100' }}
                />
            </ComposedChart>
        </ResponsiveContainer>
    )
}

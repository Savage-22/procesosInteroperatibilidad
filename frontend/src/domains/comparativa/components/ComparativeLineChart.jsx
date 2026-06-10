import { useState } from 'react'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

export default function ComparativeLineChart({ procesos, datos }) {
    const [ocultos, setOcultos] = useState(new Set())

    function handleLegendClick(entry) {
        setOcultos((prev) => {
            const next = new Set(prev)
            next.has(entry.dataKey) ? next.delete(entry.dataKey) : next.add(entry.dataKey)
            return next
        })
    }

    return (
        <ResponsiveContainer width="100%" height={320}>
            <LineChart data={datos} margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 105]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => v !== null ? [`${v?.toFixed(1)}%`] : ['Sin datos']} />
                <Legend
                    onClick={handleLegendClick}
                    wrapperStyle={{ cursor: 'pointer' }}
                    formatter={(value, entry) => (
                        <span style={{ textDecoration: ocultos.has(entry.dataKey) ? 'line-through' : 'none' }}>
                            {value}
                        </span>
                    )}
                />
                {procesos.map((p) => (
                    <Line
                        key={p.codigo}
                        type="monotone"
                        dataKey={p.codigo}
                        name={p.codigo}
                        stroke={p.color_hex}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls={false}
                        hide={ocultos.has(p.codigo)}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    )
}

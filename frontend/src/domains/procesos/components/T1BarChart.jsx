import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

import { SEMAFORO_COLOR } from '../../../shared/semaforo'

export default function T1BarChart({ meses }) {
    return (
        <ResponsiveContainer width="100%" height={240}>
            <BarChart data={meses} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 105]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v?.toFixed(1)}%`, 'Avance T1']} />
                <ReferenceLine y={95} stroke="#1f7a47" strokeDasharray="4 2" label={{ value: '95%', fontSize: 10, fill: '#1f7a47' }} />
                <ReferenceLine y={75} stroke="#f4d100" strokeDasharray="4 2" label={{ value: '75%', fontSize: 10, fill: '#854d0e' }} />
                <Bar dataKey="avance_t1" name="Avance T1" radius={[4, 4, 0, 0]}>
                    {meses.map((m, i) => (
                        <Cell key={i} fill={SEMAFORO_COLOR[m.semaforo] ?? '#6b7280'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    )
}

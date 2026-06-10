import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

import { SEMAFORO_COLOR } from '../../../shared/semaforo'

export default function SemaforoBarChart({ data }) {
    return (
        <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="codigo" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="verde" name="Verde" stackId="a" fill={SEMAFORO_COLOR.Verde} />
                <Bar dataKey="amarillo" name="Amarillo" stackId="a" fill={SEMAFORO_COLOR.Amarillo} />
                <Bar dataKey="rojo" name="Rojo" stackId="a" fill={SEMAFORO_COLOR.Rojo} radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}

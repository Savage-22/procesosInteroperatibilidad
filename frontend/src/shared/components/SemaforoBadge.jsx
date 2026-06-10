import { SEMAFORO_BADGE } from '../semaforo'

export default function SemaforoBadge({ semaforo }) {
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SEMAFORO_BADGE[semaforo] ?? SEMAFORO_BADGE['Sin datos']}`}>
            {semaforo}
        </span>
    )
}

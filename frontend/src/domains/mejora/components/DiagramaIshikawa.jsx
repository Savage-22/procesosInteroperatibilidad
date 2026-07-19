const ANCHO = 1000
const ALTO = 560
const ESPINA_Y = ALTO / 2
const X_INICIO = 30
const X_FIN = 780

// Posición horizontal donde cada espina se une al eje. Se reparten 3 arriba y
// 3 abajo, que es la disposición clásica del Ishikawa de 6M.
const X_RAMAS = [250, 450, 650]
const LARGO_X = 110   // cuánto se inclina la espina hacia la izquierda
const LARGO_Y = 175   // cuánto sube (o baja) la espina respecto al eje

const MAX_CAUSAS = 4  // más de 4 por categoría satura la lámina
const MAX_TEXTO = 30

const recortar = (texto) =>
    texto.length > MAX_TEXTO ? `${texto.slice(0, MAX_TEXTO - 1)}…` : texto

/** Una espina: la diagonal, la etiqueta de la categoría y sus causas. */
function Espina({ categoria, causas, x, arriba }) {
    const signo = arriba ? -1 : 1
    const xFin = x - LARGO_X
    const yFin = ESPINA_Y + signo * LARGO_Y
    const visibles = causas.slice(0, MAX_CAUSAS)
    const resto = causas.length - visibles.length

    return (
        <g>
            <line x1={x} y1={ESPINA_Y} x2={xFin} y2={yFin} stroke="#1e3654" strokeWidth="2" />

            {/* Etiqueta de la categoría, en el extremo exterior */}
            <rect
                x={xFin - 62} y={yFin + signo * 26 - 13} width="124" height="26"
                rx="6" fill="#1e3654"
            />
            <text
                x={xFin} y={yFin + signo * 26 + 5} textAnchor="middle"
                fill="#f4d100" fontSize="13" fontWeight="700"
            >
                {categoria}
            </text>

            {/* Causas, colgando de la espina */}
            {visibles.map((causa, i) => {
                const t = 0.3 + i * 0.17
                const px = x - LARGO_X * t
                const py = ESPINA_Y + signo * LARGO_Y * t
                return (
                    <g key={causa.id ?? i}>
                        <line x1={px} y1={py} x2={px + 10} y2={py} stroke="#cbd5e1" strokeWidth="1.5" />
                        <text
                            x={px + 14} y={py + 4} fontSize="10.5"
                            fill={causa.es_raiz ? '#854d0e' : '#475569'}
                            fontWeight={causa.es_raiz ? '700' : '400'}
                        >
                            {causa.es_raiz ? '★ ' : ''}{recortar(causa.descripcion)}
                            <title>{causa.descripcion}</title>
                        </text>
                    </g>
                )
            })}

            {resto > 0 && (
                <text
                    x={x - LARGO_X * 0.15 + 14} y={ESPINA_Y + signo * LARGO_Y * 0.15 + 4}
                    fontSize="10" fill="#94a3b8" fontStyle="italic"
                >
                    +{resto} más
                </text>
            )}
        </g>
    )
}

/**
 * Diagrama de Ishikawa (espina de pescado) de las 6M.
 *
 * Es la misma información que las tarjetas por categoría, pero en la lámina
 * que pide la metodología: sirve para presentar el diagnóstico y para
 * imprimirlo como evidencia del trabajo.
 */
export default function DiagramaIshikawa({ codigo, proceso, categorias, ishikawa }) {
    const total = categorias.reduce((suma, cat) => suma + (ishikawa[cat]?.length ?? 0), 0)

    if (total === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-gray-200">lan</span>
                <p className="text-sm text-gray-400 mt-2">
                    Agrega causas para dibujar el diagrama de Ishikawa.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 break-inside-avoid">
            <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
                <h3 className="text-sm font-bold text-[#1e3654]">Diagrama de Ishikawa (6M)</h3>
                <span className="text-xs text-gray-400">
                    {total} causa(s) · ★ = causa raíz
                </span>
            </div>

            <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full min-w-[720px]" role="img"
                     aria-label={`Diagrama de Ishikawa de ${codigo}`}>
                    {/* Eje central con la flecha hacia el efecto */}
                    <defs>
                        <marker id="punta" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
                            <polygon points="0 0, 10 4, 0 8" fill="#1e3654" />
                        </marker>
                    </defs>
                    <line
                        x1={X_INICIO} y1={ESPINA_Y} x2={X_FIN} y2={ESPINA_Y}
                        stroke="#1e3654" strokeWidth="3" markerEnd="url(#punta)"
                    />

                    {categorias.slice(0, 3).map((cat, i) => (
                        <Espina key={cat} categoria={cat} causas={ishikawa[cat] ?? []} x={X_RAMAS[i]} arriba />
                    ))}
                    {categorias.slice(3, 6).map((cat, i) => (
                        <Espina key={cat} categoria={cat} causas={ishikawa[cat] ?? []} x={X_RAMAS[i]} arriba={false} />
                    ))}

                    {/* Efecto: el problema que se está diagnosticando */}
                    <rect x={X_FIN + 10} y={ESPINA_Y - 46} width={ANCHO - X_FIN - 20} height="92"
                          rx="10" fill="#ffe8e8" stroke="#9c1d1d" strokeWidth="1.5" />
                    <text x={X_FIN + 10 + (ANCHO - X_FIN - 20) / 2} y={ESPINA_Y - 20}
                          textAnchor="middle" fontSize="13" fontWeight="700" fill="#9c1d1d">
                        {codigo}
                    </text>
                    <text x={X_FIN + 10 + (ANCHO - X_FIN - 20) / 2} y={ESPINA_Y + 2}
                          textAnchor="middle" fontSize="10" fill="#9c1d1d">
                        no alcanza su meta
                    </text>
                    <text x={X_FIN + 10 + (ANCHO - X_FIN - 20) / 2} y={ESPINA_Y + 24}
                          textAnchor="middle" fontSize="9" fill="#b45454">
                        <title>{proceso}</title>
                        {proceso && proceso.length > 24 ? `${proceso.slice(0, 23)}…` : proceso}
                    </text>
                </svg>
            </div>
        </div>
    )
}

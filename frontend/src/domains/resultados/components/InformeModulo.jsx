import { useState, useCallback } from 'react'

import InformeIA from '../../../shared/components/InformeIA'
import { obtenerInformeModulo } from '../../../shared/services/analisisService'

/**
 * Informe de gestión de un macroproceso (M1, M2, M3, M4).
 *
 * El informe ejecutivo habla de la entidad entera; este habla solo del módulo
 * elegido, que es el nivel al que responde su responsable. Cada módulo archiva
 * el suyo por separado, así que cambiar de pestaña recupera el que ya se generó
 * en vez de perderlo.
 */
export default function InformeModulo({ modulos }) {
    const [modulo, setModulo] = useState(modulos[0] ?? null)

    const generar = useCallback(() => obtenerInformeModulo(modulo), [modulo])

    if (!modulos.length) return null

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap no-print">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Informe por macroproceso
                </span>
                {modulos.map((m) => (
                    <button
                        key={m}
                        onClick={() => setModulo(m)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium font-mono transition-colors ${
                            m === modulo
                                ? 'bg-[#1e3654] text-white'
                                : 'text-[#1e3654] border border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {m}
                    </button>
                ))}
            </div>

            <InformeIA
                tipo="modulo"
                alcance={modulo}
                onGenerar={generar}
                icono="account_tree"
                titulo={`Informe del macroproceso ${modulo}`}
                descripcion={`Desempeño, proyección y ciclo de mejora de los procesos de ${modulo}.`}
            />
        </div>
    )
}

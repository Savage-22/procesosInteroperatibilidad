import { useCallback, useEffect, useMemo, useState } from 'react'

import { getMeta } from '../api/metaApi'
import { DatosContext, META_INICIAL } from './datosContext'

const INTERVALO_MS = 15000

export function DatosProvider({ children }) {
    const [meta, setMeta] = useState(META_INICIAL)

    const refrescar = useCallback(async () => {
        try {
            const res = await getMeta()
            setMeta((prev) =>
                prev.version === res.data.version
                    ? prev
                    : {
                        version: res.data.version,
                        ultimaCarga: res.data.ultima_carga,
                        modulosCargados: res.data.modulos_cargados,
                        advertencias: res.data.advertencias,
                    },
            )
        } catch {
            // Backend caído o sin red: se reintenta en el siguiente ciclo
        }
    }, [])

    useEffect(() => {
        const primeraConsulta = setTimeout(refrescar, 0)
        const intervalo = setInterval(refrescar, INTERVALO_MS)
        return () => {
            clearTimeout(primeraConsulta)
            clearInterval(intervalo)
        }
    }, [refrescar])

    const value = useMemo(() => ({ ...meta, refrescar }), [meta, refrescar])

    return <DatosContext.Provider value={value}>{children}</DatosContext.Provider>
}

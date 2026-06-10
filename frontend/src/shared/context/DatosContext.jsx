import { useEffect, useState } from 'react'

import { getMeta } from '../api/metaApi'
import { DatosContext, META_INICIAL } from './datosContext'

const INTERVALO_MS = 15000

export function DatosProvider({ children }) {
    const [meta, setMeta] = useState(META_INICIAL)

    useEffect(() => {
        let isMounted = true

        async function consultar() {
            try {
                const res = await getMeta()
                if (!isMounted) return
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
        }

        consultar()
        const intervalo = setInterval(consultar, INTERVALO_MS)
        return () => {
            isMounted = false
            clearInterval(intervalo)
        }
    }, [])

    return <DatosContext.Provider value={meta}>{children}</DatosContext.Provider>
}

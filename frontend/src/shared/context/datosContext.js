import { createContext } from 'react'

export const META_INICIAL = {
    version: null,
    ultimaCarga: null,
    modulosCargados: [],
    advertencias: [],
}

export const DatosContext = createContext(META_INICIAL)

import { useContext } from 'react'

import { DatosContext } from '../context/datosContext'

export function useDatos() {
    return useContext(DatosContext)
}

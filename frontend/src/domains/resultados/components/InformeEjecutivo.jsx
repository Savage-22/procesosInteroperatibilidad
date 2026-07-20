import { useCallback } from 'react'

import InformeIA from '../../../shared/components/InformeIA'
import { obtenerInforme } from '../../../shared/services/analisisService'

/**
 * Informe ejecutivo del estado institucional, redactado por la IA sobre todos
 * los datos del sistema. Es imprimible: la dirección suele pedirlo en papel.
 */
export default function InformeEjecutivo() {
    const generar = useCallback(() => obtenerInforme(), [])

    return (
        <InformeIA
            tipo="ejecutivo"
            onGenerar={generar}
            titulo="Informe ejecutivo"
            descripcion="Estado institucional completo, listo para presentar a la alta dirección."
        />
    )
}

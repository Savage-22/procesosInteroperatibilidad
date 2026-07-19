import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useDatos } from '../../../shared/hooks/useDatos'
import Anexo1 from '../components/Anexo1'
import Anexo2 from '../components/Anexo2'
import Anexo4 from '../components/Anexo4'
import { obtenerAnexo, obtenerIndice, requiereProceso, getErrorMessage } from '../services/anexosService'

const VISTAS = { 1: Anexo1, 2: Anexo2, 4: Anexo4 }

function TarjetaAnexo({ anexo, activo, onSeleccionar }) {
    const completo = anexo.total > 0 && anexo.completos === anexo.total
    return (
        <button
            onClick={() => onSeleccionar(anexo.numero)}
            disabled={!anexo.disponible}
            className={`text-left p-4 rounded-xl border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                activo
                    ? 'border-[#1e3654] bg-[#1e3654] text-white'
                    : 'border-gray-100 bg-white hover:border-[#1e3654]/30'
            }`}
        >
            <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${activo ? 'text-[#f4d100]' : 'text-gray-400'}`}>
                    Anexo {anexo.numero}
                </span>
                {anexo.disponible && (
                    <span className={`material-symbols-outlined text-base ${
                        completo ? 'text-[#1f7a47]' : activo ? 'text-white/50' : 'text-gray-300'
                    }`}>
                        {completo ? 'check_circle' : 'pending'}
                    </span>
                )}
            </div>
            <p className={`text-sm font-semibold mt-1 ${activo ? 'text-white' : 'text-[#1e3654]'}`}>
                {anexo.titulo}
            </p>
            <p className={`text-xs mt-1 ${activo ? 'text-white/60' : 'text-gray-500'}`}>
                {anexo.disponible ? anexo.detalle : 'Aún no hay datos para emitirlo'}
            </p>
        </button>
    )
}

export default function AnexosPage() {
    const { version } = useDatos()
    const [params, setParams] = useSearchParams()

    const numero = Number(params.get('anexo')) || 1
    const codigo = params.get('proceso') ?? ''

    const [indice, setIndice] = useState(null)
    const [documento, setDocumento] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [cargandoDoc, setCargandoDoc] = useState(false)
    const [error, setError] = useState(null)

    const actualizar = useCallback((cambios) => {
        setParams((prev) => {
            const siguiente = new URLSearchParams(prev)
            Object.entries(cambios).forEach(([clave, valor]) => {
                if (valor) siguiente.set(clave, valor)
                else siguiente.delete(clave)
            })
            return siguiente
        })
    }, [setParams])

    // Índice de anexos disponibles
    useEffect(() => {
        let activo = true
        obtenerIndice()
            .then((data) => { if (activo) { setIndice(data); setError(null) } })
            .catch((err) => { if (activo) setError(getErrorMessage(err)) })
            .finally(() => { if (activo) setIsLoading(false) })
        return () => { activo = false }
    }, [version])

    // Al elegir un anexo por proceso sin proceso seleccionado, toma el primero
    // con datos; si ninguno los tiene, el primer proceso no-macroproceso.
    useEffect(() => {
        if (!indice || !requiereProceso(numero) || codigo) return
        const campo = numero === 2 ? 'tiene_ficha' : 'tiene_indicadores'
        const candidato =
            indice.procesos.find((p) => p[campo]) ??
            indice.procesos.find((p) => p.nivel > 0) ??
            indice.procesos[0]
        if (candidato) actualizar({ proceso: candidato.codigo })
    }, [indice, numero, codigo, actualizar])

    // Documento del anexo seleccionado
    useEffect(() => {
        if (requiereProceso(numero) && !codigo) return
        let activo = true

        async function cargar() {
            setCargandoDoc(true)
            try {
                const data = await obtenerAnexo(numero, codigo)
                // Se etiqueta con su anexo+proceso: así el render nunca entrega
                // a una vista el documento con la forma de otro anexo (evita, p.ej.,
                // pintar el Anexo 4 con los datos del Anexo 1 durante el cambio).
                if (activo) { setDocumento({ clave: `${numero}|${codigo}`, datos: data }); setError(null) }
            } catch (err) {
                if (activo) { setDocumento(null); setError(getErrorMessage(err)) }
            } finally {
                if (activo) setCargandoDoc(false)
            }
        }

        cargar()
        return () => { activo = false }
    }, [numero, codigo, version])

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Cargando anexos…
        </div>
    )

    if (!indice || indice.total_procesos === 0) return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center space-y-3 max-w-xl mx-auto mt-8">
            <span className="material-symbols-outlined text-5xl text-gray-300">description</span>
            <p className="font-semibold text-[#1e3654]">Todavía no hay anexos que emitir</p>
            <p className="text-sm text-gray-500">
                Los anexos se generan con los datos que cargues: el inventario alimenta el Anexo 1,
                las fichas SIPOC el Anexo 2 y los indicadores el Anexo 4.
            </p>
        </div>
    )

    const Vista = VISTAS[numero]
    // Solo se usa el documento si corresponde al anexo/proceso en pantalla.
    const claveActual = `${numero}|${requiereProceso(numero) ? codigo : ''}`
    const doc = documento?.clave === claveActual ? documento.datos : null
    const procesosVista = numero === 2
        ? indice.procesos
        : indice.procesos.filter((p) => p.tiene_indicadores || p.codigo === codigo)

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap no-print">
                <div>
                    <h1 className="text-2xl font-bold text-[#1e3654]">Anexos</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Vista previa de los anexos de la Directiva CEPLAN N° 0056-2024, generados con tus datos.
                    </p>
                </div>
                <button
                    onClick={() => window.print()}
                    disabled={!doc}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56] disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                    Descargar PDF
                </button>
            </div>

            {/* Selector de anexo */}
            <div className="grid sm:grid-cols-3 gap-3 no-print">
                {indice.anexos.map((a) => (
                    <TarjetaAnexo
                        key={a.numero}
                        anexo={a}
                        activo={a.numero === numero}
                        onSeleccionar={(n) => actualizar({ anexo: n, proceso: requiereProceso(n) ? codigo : null })}
                    />
                ))}
            </div>

            {/* Selector de proceso */}
            {requiereProceso(numero) && (
                <label className="flex items-center gap-2 flex-wrap no-print">
                    <span className="text-xs font-semibold text-[#1e3654]">Proceso:</span>
                    <select
                        value={codigo}
                        onChange={(e) => actualizar({ proceso: e.target.value })}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3654]/20"
                    >
                        {procesosVista.map((p) => (
                            <option key={p.codigo} value={p.codigo}>
                                {p.codigo} · {p.nombre}
                                {numero === 2 && !p.tiene_ficha ? ' (sin ficha)' : ''}
                                {numero === 4 && !p.tiene_indicadores ? ' (sin indicadores)' : ''}
                            </option>
                        ))}
                    </select>
                </label>
            )}

            {error && (
                <p className="flex items-center gap-2 p-4 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl text-sm no-print">
                    <span className="material-symbols-outlined">error</span>{error}
                </p>
            )}

            {cargandoDoc && !doc && (
                <div className="flex items-center justify-center h-40 gap-2 text-gray-500">
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Generando el anexo…
                </div>
            )}

            {doc && Vista && (
                <div className="zona-imprimible">
                    <Vista anexo={doc} />
                </div>
            )}
        </div>
    )
}

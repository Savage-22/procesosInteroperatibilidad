import { useState, useEffect } from 'react'

import {
    obtenerInvestigaciones,
    guardarInvestigacion,
    borrarInvestigacion,
    getErrorMessage,
} from '../services/investigacionesService'

const INP = 'w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3654]/20'

const VACIO = {
    titulo: '', autores: '', anio: '', tipo: 'tesis',
    institucion: '', url: '', aporte: '',
}

function Referencia({ investigacion, onEliminar }) {
    const { titulo, autores, anio, tipo, institucion, url, aporte } = investigacion
    return (
        <li className="border border-gray-100 rounded-lg p-3 hover:bg-[#f8fafc] group">
            <div className="flex items-start gap-2">
                <div className="flex-1">
                    {url ? (
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-[#1e3654] hover:underline"
                        >
                            {titulo}
                            <span className="material-symbols-outlined text-sm align-middle ml-0.5">open_in_new</span>
                        </a>
                    ) : (
                        <p className="text-sm font-semibold text-[#1e3654]">{titulo}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">
                        {[autores, institucion, anio].filter(Boolean).join(' · ')}
                        {tipo && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">{tipo}</span>}
                    </p>
                    {aporte && <p className="text-xs text-gray-600 mt-1.5 italic">{aporte}</p>}
                </div>
                <button
                    onClick={() => onEliminar(investigacion)}
                    title="Eliminar investigación"
                    className="text-gray-300 hover:text-[#9c1d1d]"
                >
                    <span className="material-symbols-outlined text-base">delete</span>
                </button>
            </div>
        </li>
    )
}

function FormularioReferencia({ macroproceso, tipos, onGuardar }) {
    const [abierto, setAbierto] = useState(false)
    const [campos, setCampos] = useState(VACIO)

    function set(campo, valor) { setCampos((p) => ({ ...p, [campo]: valor })) }

    async function guardar() {
        if (!campos.titulo.trim()) return
        await onGuardar({
            ...campos,
            macroproceso,
            anio: campos.anio === '' ? null : Number(campos.anio),
        })
        setCampos(VACIO)
        setAbierto(false)
    }

    if (!abierto) return (
        <button
            onClick={() => setAbierto(true)}
            className="flex items-center gap-1 text-xs font-medium text-[#1e3654] hover:underline"
        >
            <span className="material-symbols-outlined text-base">add</span>
            Agregar investigación a {macroproceso}
        </button>
    )

    return (
        <div className="space-y-2 border-t border-gray-100 pt-3">
            <input value={campos.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Título completo *" className={INP} />
            <div className="grid grid-cols-2 gap-2">
                <input value={campos.autores} onChange={(e) => set('autores', e.target.value)} placeholder="Autor(es)" className={INP} />
                <input value={campos.institucion} onChange={(e) => set('institucion', e.target.value)} placeholder="Universidad o entidad" className={INP} />
                <input value={campos.anio} onChange={(e) => set('anio', e.target.value)} type="number" placeholder="Año" className={INP} />
                <select value={campos.tipo} onChange={(e) => set('tipo', e.target.value)} className={INP}>
                    {tipos.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
            </div>
            <input value={campos.url} onChange={(e) => set('url', e.target.value)} placeholder="Enlace al repositorio (https://…)" className={INP} />
            <input value={campos.aporte} onChange={(e) => set('aporte', e.target.value)} placeholder="Qué del macroproceso sustenta" className={INP} />
            <div className="flex gap-2">
                <button onClick={guardar} className="px-3 py-1.5 rounded bg-[#1e3654] text-white text-sm hover:bg-[#0c2f56]">
                    Guardar
                </button>
                <button onClick={() => { setCampos(VACIO); setAbierto(false) }} className="px-3 py-1.5 rounded text-sm text-gray-500 hover:bg-gray-100">
                    Cancelar
                </button>
            </div>
        </div>
    )
}

export default function InvestigacionesSection() {
    const [datos, setDatos] = useState(null)
    const [error, setError] = useState(null)

    async function cargar() {
        try { setDatos(await obtenerInvestigaciones()); setError(null) }
        catch (err) { setError(getErrorMessage(err)) }
    }

    useEffect(() => {
        let montado = true
        obtenerInvestigaciones()
            .then((d) => montado && setDatos(d))
            .catch((e) => montado && setError(getErrorMessage(e)))
        return () => { montado = false }
    }, [])

    async function agregar(datosNuevos) {
        try { await guardarInvestigacion(datosNuevos); await cargar() }
        catch (err) { setError(getErrorMessage(err)) }
    }

    async function eliminar(investigacion) {
        if (!window.confirm(`¿Eliminar "${investigacion.titulo}"?`)) return
        await borrarInvestigacion(investigacion.id)
        await cargar()
    }

    if (error) return (
        <div className="flex items-center gap-2 p-4 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl text-sm">
            <span className="material-symbols-outlined">error</span>{error}
        </div>
    )
    if (!datos) return <p className="text-gray-400 text-sm">Cargando…</p>

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-600">
                Cada macroproceso se respalda con investigaciones —tesis, artículos o normas—
                que justifican cómo está planteado. Registra aquí la referencia y qué parte
                del macroproceso sustenta; todo viaja en el Excel exportado.
            </p>

            {datos.sin_sustento.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-[#fef9c3] text-[#854d0e] rounded-lg text-sm">
                    <span className="material-symbols-outlined text-base">info</span>
                    Sin sustento todavía: <strong>{datos.sin_sustento.join(', ')}</strong>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {datos.macroprocesos.map((macroproceso) => {
                    const referencias = datos.investigaciones[macroproceso] ?? []
                    return (
                        <div key={macroproceso} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="flex items-center gap-1.5 text-sm font-bold text-[#1e3654]">
                                    <span className="material-symbols-outlined text-base text-gray-400">menu_book</span>
                                    {macroproceso}
                                </h4>
                                <span className="text-xs text-gray-400">
                                    {referencias.length} {referencias.length === 1 ? 'referencia' : 'referencias'}
                                </span>
                            </div>

                            {referencias.length > 0 ? (
                                <ul className="space-y-2">
                                    {referencias.map((inv) => (
                                        <Referencia key={inv.id} investigacion={inv} onEliminar={eliminar} />
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-gray-400">Todavía sin investigaciones registradas.</p>
                            )}

                            <FormularioReferencia
                                macroproceso={macroproceso}
                                tipos={datos.tipos}
                                onGuardar={agregar}
                            />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

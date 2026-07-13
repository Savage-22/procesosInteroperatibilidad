import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { useDatos } from '../../../shared/hooks/useDatos'
import {
    obtenerInventario,
    guardarProceso,
    borrarProceso,
    precargarPlantilla,
    getErrorMessage,
} from '../services/inventarioService'

// ── ayuda contextual por campo ────────────────────────────────────────────────

const AYUDA = {
    codigo: 'Código jerárquico del proceso. Usa la notación por niveles: M3 → M3.1 → M3.1.1.',
    producto: 'El bien o servicio que entrega el proceso (su salida principal).',
    base_legal: 'Norma que sustenta el proceso (ley, directiva, reglamento).',
}

// ── modal de alta/edición ─────────────────────────────────────────────────────

function FormularioProceso({ estado, onGuardar, onCerrar }) {
    const editando = estado.mode === 'editar'
    const [form, setForm] = useState({
        codigo: estado.proceso?.codigo ?? '',
        nombre: estado.proceso?.nombre ?? '',
        producto: estado.proceso?.producto ?? '',
        base_legal: estado.proceso?.base_legal ?? '',
    })
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState(null)

    const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

    async function handleSubmit(e) {
        e.preventDefault()
        if (guardando) return
        setGuardando(true)
        setError(null)
        try {
            const datos = { ...form }
            if (!editando) datos.codigo_padre = estado.padreCodigo ?? null
            await onGuardar(datos, editando ? estado.proceso.id : null)
        } catch (err) {
            setError(getErrorMessage(err))
            setGuardando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCerrar}>
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="font-bold text-[#1e3654]">
                        {editando ? 'Editar proceso' : estado.padreCodigo ? `Nuevo subproceso de ${estado.padreCodigo}` : 'Nuevo proceso'}
                    </h2>
                    <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {!editando && estado.padreCodigo && (
                        <p className="text-xs text-gray-500 bg-[#f2f4f7] rounded-lg px-3 py-2">
                            Se creará bajo <strong className="font-mono">{estado.padreCodigo}</strong> como nivel inferior.
                        </p>
                    )}

                    <Campo etiqueta="Código" ayuda={AYUDA.codigo} requerido>
                        <input
                            value={form.codigo}
                            onChange={set('codigo')}
                            placeholder="M3.1"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3654]/20"
                        />
                    </Campo>

                    <Campo etiqueta="Nombre del proceso" requerido>
                        <input
                            value={form.nombre}
                            onChange={set('nombre')}
                            placeholder="Análisis y especificación de la integración"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3654]/20"
                        />
                    </Campo>

                    <Campo etiqueta="Producto" ayuda={AYUDA.producto}>
                        <input
                            value={form.producto}
                            onChange={set('producto')}
                            placeholder="Especificación técnica de la integración"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3654]/20"
                        />
                    </Campo>

                    <Campo etiqueta="Base legal" ayuda={AYUDA.base_legal}>
                        <input
                            value={form.base_legal}
                            onChange={set('base_legal')}
                            placeholder="Norma Técnica N° 002-2025-PCM-SGP"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3654]/20"
                        />
                    </Campo>

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-[#9c1d1d] bg-[#ffe8e8] rounded-lg px-3 py-2">
                            <span className="material-symbols-outlined text-base">error</span>
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onCerrar} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={guardando}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56] disabled:opacity-50"
                        >
                            {guardando && <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>}
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function Campo({ etiqueta, ayuda, requerido, children }) {
    return (
        <label className="block">
            <span className="block text-xs font-semibold text-[#1e3654] mb-1">
                {etiqueta} {requerido && <span className="text-[#9c1d1d]">*</span>}
            </span>
            {children}
            {ayuda && <span className="block text-xs text-gray-400 mt-1">{ayuda}</span>}
        </label>
    )
}

// ── nodo del árbol (recursivo) ────────────────────────────────────────────────

function NodoInventario({ nodo, onAgregarHijo, onEditar, onEliminar, onFicha, onIndicadores, onMejora }) {
    const [abierto, setAbierto] = useState(true)
    const tieneHijos = nodo.hijos.length > 0

    return (
        <div>
            <div
                className="group flex items-center gap-2 py-2 pr-2 rounded-lg hover:bg-[#f2f4f7]"
                style={{ paddingLeft: `${nodo.nivel * 24 + 8}px` }}
            >
                <button
                    onClick={() => setAbierto((p) => !p)}
                    className={`shrink-0 text-gray-400 ${tieneHijos ? 'hover:text-gray-600' : 'invisible'}`}
                >
                    <span className="material-symbols-outlined text-base">
                        {abierto ? 'expand_more' : 'chevron_right'}
                    </span>
                </button>

                <span className="font-mono text-sm font-semibold text-[#1e3654] shrink-0">{nodo.codigo}</span>
                <span className="text-sm text-gray-700 truncate">{nodo.nombre}</span>
                {nodo.producto && (
                    <span className="text-xs text-gray-400 truncate hidden sm:inline">· {nodo.producto}</span>
                )}

                <div className="flex items-center gap-1 ml-auto shrink-0">
                    {nodo.tiene_ficha && (
                        <span title="Tiene Ficha de Proceso (Anexo 2)" className="material-symbols-outlined text-base text-[#1f7a47]">description</span>
                    )}
                    {nodo.num_indicadores > 0 && (
                        <span title={`${nodo.num_indicadores} indicador(es)`} className="flex items-center gap-0.5 text-xs text-[#0075ca]">
                            <span className="material-symbols-outlined text-base">insights</span>{nodo.num_indicadores}
                        </span>
                    )}

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <BotonIcono icon="description" title="Ficha de proceso (Anexo 2)" onClick={() => onFicha(nodo)} />
                        <BotonIcono icon="insights" title="Indicadores (Anexo 4)" onClick={() => onIndicadores(nodo)} />
                        <BotonIcono icon="trending_up" title="Mejora (Ishikawa / oportunidades / comparación)" onClick={() => onMejora(nodo)} />
                        <BotonIcono icon="add" title="Agregar subproceso" onClick={() => onAgregarHijo(nodo)} />
                        <BotonIcono icon="edit" title="Editar" onClick={() => onEditar(nodo)} />
                        <BotonIcono icon="delete" title="Eliminar" onClick={() => onEliminar(nodo)} peligro />
                    </div>
                </div>
            </div>

            {abierto && tieneHijos && (
                <div>
                    {nodo.hijos.map((h) => (
                        <NodoInventario key={h.id} nodo={h} onAgregarHijo={onAgregarHijo} onEditar={onEditar} onEliminar={onEliminar} onFicha={onFicha} onIndicadores={onIndicadores} onMejora={onMejora} />
                    ))}
                </div>
            )}
        </div>
    )
}

function BotonIcono({ icon, title, onClick, peligro }) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={`p-1 rounded ${peligro ? 'text-gray-400 hover:text-[#9c1d1d] hover:bg-[#ffe8e8]' : 'text-gray-400 hover:text-[#1e3654] hover:bg-white'}`}
        >
            <span className="material-symbols-outlined text-base">{icon}</span>
        </button>
    )
}

// ── empty state ───────────────────────────────────────────────────────────────

function SinInventario({ onCrear, onPlantilla, cargandoPlantilla }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center space-y-4">
            <span className="material-symbols-outlined text-5xl text-gray-300">account_tree</span>
            <div>
                <p className="font-semibold text-[#1e3654]">Aún no tienes un inventario de procesos</p>
                <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                    El inventario (Anexo 1) es el árbol jerárquico de tus procesos. Empieza desde
                    cero o parte de la plantilla de interoperabilidad M1–M4 y edítala a tu medida.
                </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
                <button onClick={onCrear} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56]">
                    <span className="material-symbols-outlined text-base">add</span>
                    Crear inventario
                </button>
                <button
                    onClick={onPlantilla}
                    disabled={cargandoPlantilla}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#f4d100] text-[#1e3654] hover:brightness-95 disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined text-base ${cargandoPlantilla ? 'animate-spin' : ''}`}>
                        {cargandoPlantilla ? 'progress_activity' : 'auto_awesome'}
                    </span>
                    Usar plantilla M1–M4
                </button>
            </div>
        </div>
    )
}

// ── página principal ──────────────────────────────────────────────────────────

export default function InventarioPage() {
    const navigate = useNavigate()
    const { refrescar } = useDatos()
    const [datos, setDatos] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [modal, setModal] = useState({ open: false, mode: 'crear', proceso: null, padreCodigo: null })
    const [cargandoPlantilla, setCargandoPlantilla] = useState(false)

    async function cargar() {
        try {
            const data = await obtenerInventario()
            setDatos(data)
            setError(null)
        } catch {
            setError('No se pudo cargar el inventario. Verifica que el servidor esté activo.')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        let isMounted = true
        async function inicial() {
            try {
                const data = await obtenerInventario()
                if (isMounted) { setDatos(data); setError(null) }
            } catch {
                if (isMounted) setError('No se pudo cargar el inventario. Verifica que el servidor esté activo.')
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }
        inicial()
        return () => { isMounted = false }
    }, [])

    async function handleGuardar(valores, id) {
        await guardarProceso(valores, id)
        setModal({ open: false, mode: 'crear', proceso: null, padreCodigo: null })
        await cargar()
        refrescar()
    }

    async function handleEliminar(nodo) {
        if (!window.confirm(`¿Eliminar el proceso "${nodo.codigo} — ${nodo.nombre}"?`)) return
        try {
            await borrarProceso(nodo.id)
            await cargar()
            refrescar()
        } catch (err) {
            alert(getErrorMessage(err))
        }
    }

    async function handlePlantilla() {
        setCargandoPlantilla(true)
        try {
            await precargarPlantilla()
            await cargar()
            refrescar()
        } finally {
            setCargandoPlantilla(false)
        }
    }

    const abrirCrear = () => setModal({ open: true, mode: 'crear', proceso: null, padreCodigo: null })
    const abrirHijo = (nodo) => setModal({ open: true, mode: 'crear', proceso: null, padreCodigo: nodo.codigo })
    const abrirEditar = (nodo) => setModal({ open: true, mode: 'editar', proceso: nodo, padreCodigo: null })
    const cerrar = () => setModal((m) => ({ ...m, open: false }))

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Cargando inventario…
        </div>
    )

    if (error) return (
        <div className="flex items-center gap-2 p-6 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl">
            <span className="material-symbols-outlined">error</span>
            {error}
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-[#1e3654]">Inventario de procesos</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Anexo 1 · Jerarquía de productos y procesos (Norma Técnica N° 002-2025-PCM-SGP)
                    </p>
                </div>
                {datos?.tiene_datos && (
                    <button onClick={abrirCrear} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56]">
                        <span className="material-symbols-outlined text-base">add</span>
                        Nuevo proceso
                    </button>
                )}
            </div>

            {!datos?.tiene_datos ? (
                <SinInventario onCrear={abrirCrear} onPlantilla={handlePlantilla} cargandoPlantilla={cargandoPlantilla} />
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                    {datos.arbol.map((nodo) => (
                        <NodoInventario
                            key={nodo.id}
                            nodo={nodo}
                            onAgregarHijo={abrirHijo}
                            onEditar={abrirEditar}
                            onEliminar={handleEliminar}
                            onFicha={(n) => navigate(`/proceso/${n.codigo}/ficha`)}
                            onIndicadores={(n) => navigate(`/proceso/${n.codigo}/indicadores`)}
                            onMejora={(n) => navigate(`/proceso/${n.codigo}/mejora`)}
                        />
                    ))}
                </div>
            )}

            {modal.open && (
                <FormularioProceso estado={modal} onGuardar={handleGuardar} onCerrar={cerrar} />
            )}
        </div>
    )
}

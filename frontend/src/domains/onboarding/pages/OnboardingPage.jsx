import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { useDatos } from '../../../shared/hooks/useDatos'
import { obtenerInventario, guardarProceso, precargarPlantilla, getErrorMessage } from '../../inventario/services/inventarioService'
import { guardarIndicador, capturarMedicion } from '../../fichas/services/indicadoresService'
import { obtenerResumen, actualizarOrganizacion, aplanarArbol } from '../services/organizacionService'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const PASOS = [
    { n: 1, titulo: 'Organización', icon: 'apartment' },
    { n: 2, titulo: 'Inventario', icon: 'account_tree' },
    { n: 3, titulo: 'Fichas', icon: 'description' },
    { n: 4, titulo: 'Indicadores', icon: 'insights' },
    { n: 5, titulo: 'Listo', icon: 'check_circle' },
]

const GLOSARIO = [
    ['Proceso', 'Conjunto de actividades que transforma entradas en un producto o servicio.'],
    ['Inventario (Anexo 1)', 'Lista jerárquica de tus procesos por niveles: M3 → M3.1 → M3.1.1.'],
    ['SIPOC (Anexo 2)', 'Proveedores → Entradas → Proceso → Salidas → Clientes: la cadena del proceso.'],
    ['Indicador (Anexo 4)', 'Métrica que mide el desempeño (ej. % de solicitudes atendidas).'],
    ['Eficacia / Eficiencia / Efectividad', 'Cumplir el resultado / usar bien los recursos / lograr impacto real.'],
    ['Sentido', 'Ascendente: más es mejor. Descendente: menos es mejor (ej. días de demora).'],
    ['Meta / Línea base', 'Valor objetivo a alcanzar / punto de partida actual del indicador.'],
]

const INP = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3654]/20'
const num = (v) => (v === '' || v == null ? null : Number(v))

// ── barra de progreso ─────────────────────────────────────────────────────────

function Progreso({ paso, onIr }) {
    return (
        <div className="flex items-center">
            {PASOS.map((p, i) => (
                <div key={p.n} className="flex items-center flex-1 last:flex-none">
                    <button
                        onClick={() => onIr(p.n)}
                        className={`flex items-center gap-2 shrink-0 ${p.n <= paso ? '' : 'opacity-50'}`}
                    >
                        <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                            p.n < paso ? 'bg-[#1f7a47] text-white' : p.n === paso ? 'bg-[#1e3654] text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                            {p.n < paso ? <span className="material-symbols-outlined text-base">check</span> : p.n}
                        </span>
                        <span className={`text-xs font-medium hidden sm:block ${p.n === paso ? 'text-[#1e3654]' : 'text-gray-400'}`}>{p.titulo}</span>
                    </button>
                    {i < PASOS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${p.n < paso ? 'bg-[#1f7a47]' : 'bg-gray-200'}`} />}
                </div>
            ))}
        </div>
    )
}

function Glosario() {
    const [abierto, setAbierto] = useState(false)
    return (
        <div className="bg-[#f2f4f7] rounded-xl border border-gray-100">
            <button onClick={() => setAbierto((p) => !p)} className="w-full flex items-center justify-between px-4 py-2.5 text-left">
                <span className="flex items-center gap-2 text-xs font-semibold text-[#1e3654]">
                    <span className="material-symbols-outlined text-base">help</span> Glosario · ¿qué significa cada término?
                </span>
                <span className="material-symbols-outlined text-gray-400 text-base">{abierto ? 'expand_less' : 'expand_more'}</span>
            </button>
            {abierto && (
                <dl className="px-4 pb-3 space-y-2">
                    {GLOSARIO.map(([term, def]) => (
                        <div key={term}>
                            <dt className="text-xs font-semibold text-[#1e3654]">{term}</dt>
                            <dd className="text-xs text-gray-500">{def}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </div>
    )
}

function Tarjeta({ titulo, descripcion, children }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
                <h2 className="text-lg font-bold text-[#1e3654]">{titulo}</h2>
                {descripcion && <p className="text-sm text-gray-500 mt-1">{descripcion}</p>}
            </div>
            {children}
        </div>
    )
}

// ── Paso 1 · Organización ─────────────────────────────────────────────────────

function PasoOrganizacion({ resumen, onGuardar, guardando }) {
    const inicial = resumen?.nombre && resumen.nombre !== 'Mi organización' ? resumen.nombre : ''
    const [nombre, setNombre] = useState(inicial)
    const [sector, setSector] = useState(resumen?.sector ?? '')
    const [error, setError] = useState(null)

    async function submit() {
        if (!nombre.trim()) { setError('Escribe el nombre de tu organización'); return }
        setError(null)
        await onGuardar({ nombre, sector })
    }

    return (
        <Tarjeta titulo="¿Cómo se llama tu organización?" descripcion="Empecemos por lo básico. Podrás cambiarlo luego.">
            <label className="block">
                <span className="block text-xs font-semibold text-[#1e3654] mb-1">Nombre de la organización *</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Municipalidad de…" className={INP} />
            </label>
            <label className="block">
                <span className="block text-xs font-semibold text-[#1e3654] mb-1">Sector</span>
                <input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Gobierno local, salud, educación…" className={INP} />
            </label>
            {error && <p className="text-sm text-[#9c1d1d]">{error}</p>}
            <button onClick={submit} disabled={guardando} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56] disabled:opacity-50">
                {guardando && <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>}
                Guardar y continuar
            </button>
        </Tarjeta>
    )
}

// ── Paso 2 · Inventario ───────────────────────────────────────────────────────

function PasoInventario({ inventario, onPlantilla, onCrearProceso, cargandoPlantilla }) {
    const [codigo, setCodigo] = useState('')
    const [nombre, setNombre] = useState('')
    const [error, setError] = useState(null)
    const procesos = aplanarArbol(inventario?.arbol)

    async function agregar() {
        setError(null)
        try {
            await onCrearProceso({ codigo, nombre })
            setCodigo(''); setNombre('')
        } catch (err) { setError(getErrorMessage(err)) }
    }

    return (
        <Tarjeta titulo="Arma tu inventario de procesos" descripcion="Puedes partir del catálogo de interoperabilidad (M1–M4) o crear tus propios procesos.">
            <div className="flex flex-wrap gap-2">
                <button onClick={onPlantilla} disabled={cargandoPlantilla} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#f4d100] text-[#1e3654] hover:brightness-95 disabled:opacity-50">
                    <span className={`material-symbols-outlined text-base ${cargandoPlantilla ? 'animate-spin' : ''}`}>{cargandoPlantilla ? 'progress_activity' : 'auto_awesome'}</span>
                    Usar plantilla M1–M4
                </button>
                <span className="text-xs text-gray-400 self-center">o crea uno manualmente ↓</span>
            </div>

            <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
                <label className="block w-28">
                    <span className="block text-xs font-semibold text-[#1e3654] mb-1">Código</span>
                    <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="M1" className={INP} />
                </label>
                <label className="block flex-1 min-w-[180px]">
                    <span className="block text-xs font-semibold text-[#1e3654] mb-1">Nombre del proceso</span>
                    <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Gestión de…" className={INP} />
                </label>
                <button onClick={agregar} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56]">
                    <span className="material-symbols-outlined text-base">add</span> Agregar
                </button>
            </div>
            {error && <p className="text-sm text-[#9c1d1d]">{error}</p>}

            <div className="bg-[#f8fafc] rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">{procesos.length} proceso(s) en el inventario</p>
                {procesos.length === 0 ? (
                    <p className="text-xs text-gray-400">Aún no hay procesos. Usa la plantilla o agrega el primero.</p>
                ) : (
                    <ul className="space-y-1">
                        {procesos.map((p) => (
                            <li key={p.id} className="text-sm text-gray-700">
                                <span className="font-mono font-semibold text-[#1e3654]" style={{ marginLeft: `${p.nivel * 12}px` }}>{p.codigo}</span> · {p.nombre}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Tarjeta>
    )
}

// ── Paso 3 · Fichas (Anexo 2) ─────────────────────────────────────────────────

function PasoFichas({ inventario, navigate }) {
    const procesos = aplanarArbol(inventario?.arbol)
    return (
        <Tarjeta titulo="Completa las fichas de proceso (Anexo 2)" descripcion="Opcional pero recomendado. Describe cada proceso con el SIPOC. Puedes hacerlo ahora o más tarde.">
            {procesos.length === 0 ? (
                <p className="text-sm text-gray-400">Primero crea procesos en el paso anterior.</p>
            ) : (
                <ul className="divide-y divide-gray-50">
                    {procesos.map((p) => (
                        <li key={p.id} className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-700"><span className="font-mono font-semibold text-[#1e3654]">{p.codigo}</span> · {p.nombre}</span>
                            <div className="flex items-center gap-2">
                                {p.tiene_ficha && <span className="material-symbols-outlined text-base text-[#1f7a47]" title="Ficha completa">check_circle</span>}
                                <button onClick={() => navigate(`/proceso/${p.codigo}/ficha`)} className="text-xs font-medium text-[#0075ca] hover:underline">
                                    {p.tiene_ficha ? 'Editar ficha' : 'Completar ficha'}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Tarjeta>
    )
}

// ── Paso 4 · Indicadores (Anexo 4) ────────────────────────────────────────────

function PasoIndicadores({ inventario, onCrearIndicador, navigate }) {
    const procesos = aplanarArbol(inventario?.arbol)
    const [codigo, setCodigo] = useState(procesos[0]?.codigo ?? '')
    const [form, setForm] = useState({ nombre: '', sentido: 'Ascendente', unidad: '%', meta_final: '', mes: '', numerador: '', denominador: '', resultado_esperado: '' })
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState(null)
    const set = (c) => (e) => setForm((f) => ({ ...f, [c]: e.target.value }))

    async function agregar() {
        if (!codigo) { setError('Elige un proceso'); return }
        if (!form.nombre.trim()) { setError('Escribe el nombre del indicador'); return }
        setGuardando(true); setError(null)
        try {
            const indicador = { nombre: form.nombre, sentido: form.sentido, unidad: form.unidad, meta_final: num(form.meta_final) }
            const medicion = form.mes ? {
                mes: form.mes, numerador: num(form.numerador), denominador: num(form.denominador), resultado_esperado: num(form.resultado_esperado),
            } : null
            await onCrearIndicador(codigo, indicador, medicion)
            setForm({ nombre: '', sentido: 'Ascendente', unidad: '%', meta_final: '', mes: '', numerador: '', denominador: '', resultado_esperado: '' })
        } catch (err) { setError(getErrorMessage(err)) }
        finally { setGuardando(false) }
    }

    return (
        <Tarjeta titulo="Define indicadores y su primera medición" descripcion="Los indicadores y sus mediciones alimentan el semáforo, el avance y las predicciones del dashboard.">
            {procesos.length === 0 ? (
                <p className="text-sm text-gray-400">Primero crea procesos en el paso 2.</p>
            ) : (
                <>
                    <div className="grid sm:grid-cols-2 gap-3">
                        <label className="block">
                            <span className="block text-xs font-semibold text-[#1e3654] mb-1">Proceso *</span>
                            <select value={codigo} onChange={(e) => setCodigo(e.target.value)} className={INP}>
                                {procesos.map((p) => <option key={p.id} value={p.codigo}>{p.codigo} · {p.nombre}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="block text-xs font-semibold text-[#1e3654] mb-1">Nombre del indicador *</span>
                            <input value={form.nombre} onChange={set('nombre')} placeholder="% de solicitudes atendidas" className={INP} />
                        </label>
                        <label className="block">
                            <span className="block text-xs font-semibold text-[#1e3654] mb-1">Sentido</span>
                            <select value={form.sentido} onChange={set('sentido')} className={INP}>
                                <option>Ascendente</option><option>Descendente</option>
                            </select>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                                <span className="block text-xs font-semibold text-[#1e3654] mb-1">Unidad</span>
                                <input value={form.unidad} onChange={set('unidad')} placeholder="%" className={INP} />
                            </label>
                            <label className="block">
                                <span className="block text-xs font-semibold text-[#1e3654] mb-1">Meta</span>
                                <input type="number" step="any" value={form.meta_final} onChange={set('meta_final')} placeholder="90" className={INP} />
                            </label>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-3">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Primera medición (opcional)</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <select value={form.mes} onChange={set('mes')} className={INP}>
                                <option value="">Mes…</option>
                                {MESES.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <input type="number" step="any" value={form.numerador} onChange={set('numerador')} placeholder="Numerador" className={INP} />
                            <input type="number" step="any" value={form.denominador} onChange={set('denominador')} placeholder="Denominador" className={INP} />
                            <input type="number" step="any" value={form.resultado_esperado} onChange={set('resultado_esperado')} placeholder="Esperado" className={INP} />
                        </div>
                    </div>

                    {error && <p className="text-sm text-[#9c1d1d]">{error}</p>}
                    <button onClick={agregar} disabled={guardando} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56] disabled:opacity-50">
                        {guardando && <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>}
                        Agregar indicador
                    </button>

                    <div className="bg-[#f8fafc] rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Indicadores por proceso</p>
                        <ul className="space-y-1">
                            {procesos.map((p) => (
                                <li key={p.id} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700"><span className="font-mono font-semibold text-[#1e3654]">{p.codigo}</span> · {p.num_indicadores} indicador(es)</span>
                                    <button onClick={() => navigate(`/proceso/${p.codigo}/indicadores`)} className="text-xs font-medium text-[#0075ca] hover:underline">Ver / editar</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            )}
        </Tarjeta>
    )
}

// ── Paso 5 · Listo ────────────────────────────────────────────────────────────

function PasoListo({ resumen, onFinalizar, finalizando }) {
    const c = resumen?.conteos ?? {}
    const items = [
        ['Procesos', c.procesos, 'account_tree'],
        ['Fichas de proceso', c.con_ficha, 'description'],
        ['Indicadores', c.indicadores, 'insights'],
        ['Mediciones', c.mediciones, 'timeline'],
    ]
    return (
        <Tarjeta titulo="¡Todo listo!" descripcion="Con esto tu dashboard y las vistas de análisis quedan operativas.">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {items.map(([label, valor, icon]) => (
                    <div key={label} className="bg-[#f2f4f7] rounded-lg p-3 text-center">
                        <span className="material-symbols-outlined text-[#1e3654]">{icon}</span>
                        <p className="text-2xl font-bold text-[#1e3654]">{valor ?? 0}</p>
                        <p className="text-xs text-gray-500">{label}</p>
                    </div>
                ))}
            </div>
            <button onClick={onFinalizar} disabled={finalizando} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1f7a47] text-white hover:brightness-95 disabled:opacity-50">
                {finalizando && <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>}
                <span className="material-symbols-outlined text-base">dashboard</span>
                Ir al dashboard
            </button>
        </Tarjeta>
    )
}

// ── página ────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
    const navigate = useNavigate()
    const { refrescar } = useDatos()
    const [paso, setPaso] = useState(1)
    const [resumen, setResumen] = useState(null)
    const [inventario, setInventario] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [cargandoPlantilla, setCargandoPlantilla] = useState(false)

    async function recargar() {
        const [r, inv] = await Promise.all([obtenerResumen(), obtenerInventario()])
        setResumen(r)
        setInventario(inv)
        return r
    }

    useEffect(() => {
        let isMounted = true
        async function inicial() {
            try {
                const [r, inv] = await Promise.all([obtenerResumen(), obtenerInventario()])
                if (!isMounted) return
                setResumen(r)
                setInventario(inv)
                setPaso(r.paso_sugerido ?? 1)
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }
        inicial()
        return () => { isMounted = false }
    }, [])

    async function handleGuardarOrg(datos) {
        setSaving(true)
        try {
            await actualizarOrganizacion({ ...datos, estado_onboarding: 'en_progreso' })
            await recargar()
            refrescar()
            setPaso(2)
        } finally { setSaving(false) }
    }

    async function handlePlantilla() {
        setCargandoPlantilla(true)
        try { await precargarPlantilla(); await recargar(); refrescar() }
        finally { setCargandoPlantilla(false) }
    }

    async function handleCrearProceso(datos) {
        await guardarProceso(datos)
        await recargar()
        refrescar()
    }

    async function handleCrearIndicador(codigo, indicador, medicion) {
        const creado = await guardarIndicador(codigo, indicador)
        if (medicion) await capturarMedicion(creado.id, medicion)
        await recargar()
        refrescar()
    }

    async function handleFinalizar() {
        setSaving(true)
        try {
            await actualizarOrganizacion({ estado_onboarding: 'completado' })
            refrescar()
            navigate('/')
        } finally { setSaving(false) }
    }

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>Cargando asistente…
        </div>
    )

    const procesos = aplanarArbol(inventario?.arbol)

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-[#1e3654]">Empezar de 0</h1>
                    <p className="text-sm text-gray-500 mt-1">Asistente guiado para dejar tu tablero operativo, paso a paso.</p>
                </div>
                <button onClick={() => navigate('/inventario')} className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-[#1e3654]" title="Ir directo a editar sin asistente">
                    <span className="material-symbols-outlined text-sm">bolt</span> Modo experto
                </button>
            </div>

            <Progreso paso={paso} onIr={setPaso} />
            <Glosario />

            {paso === 1 && <PasoOrganizacion resumen={resumen} onGuardar={handleGuardarOrg} guardando={saving} />}
            {paso === 2 && <PasoInventario inventario={inventario} onPlantilla={handlePlantilla} onCrearProceso={handleCrearProceso} cargandoPlantilla={cargandoPlantilla} />}
            {paso === 3 && <PasoFichas inventario={inventario} navigate={navigate} />}
            {paso === 4 && <PasoIndicadores inventario={inventario} onCrearIndicador={handleCrearIndicador} navigate={navigate} />}
            {paso === 5 && <PasoListo resumen={resumen} onFinalizar={handleFinalizar} finalizando={saving} />}

            {/* Navegación */}
            {paso > 1 && (
                <div className="flex items-center justify-between">
                    <button onClick={() => setPaso((p) => Math.max(1, p - 1))} className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
                        <span className="material-symbols-outlined text-base">arrow_back</span> Atrás
                    </button>
                    {paso < 5 && (
                        <button
                            onClick={() => setPaso((p) => Math.min(5, p + 1))}
                            disabled={paso === 2 && procesos.length === 0}
                            title={paso === 2 && procesos.length === 0 ? 'Agrega al menos un proceso para continuar' : ''}
                            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56] disabled:opacity-40"
                        >
                            Siguiente <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

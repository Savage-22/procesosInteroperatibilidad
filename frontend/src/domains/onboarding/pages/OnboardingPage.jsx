import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { useDatos } from '../../../shared/hooks/useDatos'
import { pedirIndicadores, pedirSipoc } from '../../../shared/services/analisisService'
import { obtenerInventario, guardarProceso, precargarPlantilla, getErrorMessage } from '../../inventario/services/inventarioService'
import { guardarFicha } from '../../fichas/services/fichaProcesoService'
import { guardarIndicador, capturarMedicion, obtenerIndicadores } from '../../fichas/services/indicadoresService'
import SugerenciasIA from '../components/SugerenciasIA'
import { obtenerResumen, actualizarOrganizacion, aplanarArbol } from '../services/organizacionService'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const PASOS = [
    { n: 1, titulo: 'Organización', icon: 'apartment' },
    { n: 2, titulo: 'Inventario', icon: 'account_tree' },
    { n: 3, titulo: 'Fichas', icon: 'description' },
    { n: 4, titulo: 'Indicadores', icon: 'insights' },
    { n: 5, titulo: 'Mediciones', icon: 'timeline' },
    { n: 6, titulo: 'Listo', icon: 'check_circle' },
]

const ULTIMO_PASO = PASOS.length

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

function PasoFichas({ inventario, navigate, onGuardarFicha }) {
    const procesos = aplanarArbol(inventario?.arbol)
    const [objetivo, setObjetivo] = useState(procesos[0]?.codigo ?? '')
    const [guardando, setGuardando] = useState(false)
    const [aviso, setAviso] = useState(null)

    async function aplicar(sipoc, cerrar) {
        setGuardando(true)
        try {
            await onGuardarFicha(objetivo, sipoc)
            setAviso(`Ficha de ${objetivo} completada. Revísala y ajústala si hace falta.`)
            cerrar()
        } finally {
            setGuardando(false)
        }
    }

    return (
        <Tarjeta titulo="Completa las fichas de proceso (Anexo 2)" descripcion="Opcional pero recomendado. Describe cada proceso con el SIPOC. Puedes hacerlo ahora o más tarde.">
            {procesos.length > 0 && (
                <>
                    <div className="flex items-end gap-2 flex-wrap">
                        <label className="block flex-1 min-w-[200px]">
                            <span className="block text-xs font-semibold text-[#1e3654] mb-1">Proceso a caracterizar</span>
                            <select value={objetivo} onChange={(e) => setObjetivo(e.target.value)} className={INP}>
                                {procesos.map((p) => (
                                    <option key={p.id} value={p.codigo}>{p.codigo} · {p.nombre}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <SugerenciasIA
                        titulo="¿No sabes qué poner en el SIPOC?"
                        descripcion="La IA propone proveedores, entradas, salidas, actividades y riesgos según el proceso elegido."
                        textoBoton="Sugerir SIPOC"
                        onPedir={() => pedirSipoc(objetivo)}
                        deshabilitado={!objetivo}
                        motivoDeshabilitado="Elige primero un proceso"
                    >
                        {({ resultado, cerrar }) => (
                            <div className="space-y-3">
                                <div className="grid sm:grid-cols-2 gap-2">
                                    {[
                                        ['Proveedores', resultado.proveedores],
                                        ['Entradas', resultado.entradas],
                                        ['Salidas', resultado.salidas],
                                        ['Receptores', resultado.receptores],
                                        ['Actividades', resultado.actividades],
                                        ['Riesgos', resultado.riesgos],
                                    ].map(([etiqueta, items]) => (
                                        <div key={etiqueta} className="bg-white rounded-lg border border-gray-100 p-2">
                                            <p className="text-[10px] uppercase tracking-wide text-gray-400">{etiqueta}</p>
                                            <ul className="mt-0.5 space-y-0.5">
                                                {(items ?? []).map((it, i) => (
                                                    <li key={i} className="text-xs text-gray-600">· {it}</li>
                                                ))}
                                                {(items ?? []).length === 0 && <li className="text-xs text-gray-300">—</li>}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                                {resultado.objetivo && (
                                    <p className="text-xs text-gray-600">
                                        <span className="font-semibold">Objetivo propuesto: </span>{resultado.objetivo}
                                    </p>
                                )}
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => aplicar(resultado, cerrar)}
                                        disabled={guardando}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1f7a47] text-white hover:brightness-95 disabled:opacity-50"
                                    >
                                        <span className={`material-symbols-outlined text-base ${guardando ? 'animate-spin' : ''}`}>
                                            {guardando ? 'progress_activity' : 'check'}
                                        </span>
                                        Usar en {objetivo}
                                    </button>
                                    <button onClick={cerrar} className="px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100">
                                        Descartar
                                    </button>
                                </div>
                            </div>
                        )}
                    </SugerenciasIA>

                    {aviso && (
                        <p className="flex items-center gap-2 text-sm text-[#1f7a47] bg-[#dcf8e8] rounded-lg px-3 py-2">
                            <span className="material-symbols-outlined text-base">check_circle</span>{aviso}
                        </p>
                    )}
                </>
            )}

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

function PasoIndicadores({ inventario, onCrearIndicador, onUsarSugerencia, navigate }) {
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
                    <SugerenciasIA
                        titulo="¿Qué indicadores le pongo a este proceso?"
                        descripcion="La IA propone indicadores medibles con numerador y denominador, y su meta referencial."
                        textoBoton="Sugerir indicadores"
                        onPedir={() => pedirIndicadores(codigo)}
                        deshabilitado={!codigo}
                        motivoDeshabilitado="Elige primero un proceso"
                    >
                        {({ resultado, cerrar }) => (
                            <div className="space-y-2">
                                {(resultado.indicadores ?? []).map((ind, i) => (
                                    <div key={i} className="bg-white rounded-lg border border-gray-100 p-3">
                                        <div className="flex items-start justify-between gap-2 flex-wrap">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-[#1e3654]">{ind.nombre}</p>
                                                <p className="text-[11px] text-gray-400 mt-0.5">
                                                    {[ind.tipo, ind.sentido, ind.unidad].filter(Boolean).join(' · ')}
                                                    {ind.meta_final != null && ` · meta ${ind.meta_final}`}
                                                    {ind.linea_base != null && ` · línea base ${ind.linea_base}`}
                                                </p>
                                                {ind.formula && (
                                                    <p className="text-[11px] text-gray-500 mt-0.5 font-mono">{ind.formula}</p>
                                                )}
                                                {ind.justificacion && (
                                                    <p className="text-[11px] text-gray-500 mt-1">{ind.justificacion}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => onUsarSugerencia(codigo, ind)}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1f7a47] text-white hover:brightness-95 shrink-0"
                                            >
                                                <span className="material-symbols-outlined text-sm">add</span>
                                                Agregar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={cerrar} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100">
                                    Ocultar sugerencias
                                </button>
                            </div>
                        )}
                    </SugerenciasIA>

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

// ── Paso 5 · Mediciones ───────────────────────────────────────────────────────

/**
 * Captura mes a mes de un indicador. Sin mediciones no hay semáforo, avance ni
 * predicción, así que este paso es el que realmente enciende el tablero.
 */
function PasoMediciones({ inventario, onCapturar }) {
    const procesos = aplanarArbol(inventario?.arbol).filter((p) => p.num_indicadores > 0)
    const [codigo, setCodigo] = useState(procesos[0]?.codigo ?? '')
    const [indicadores, setIndicadores] = useState([])
    const [indicadorId, setIndicadorId] = useState('')
    const [form, setForm] = useState({ mes: '', numerador: '', denominador: '', resultado_esperado: '' })
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState(null)
    const set = (c) => (e) => setForm((f) => ({ ...f, [c]: e.target.value }))

    // Al cambiar de proceso se recargan sus indicadores para poder elegir uno
    useEffect(() => {
        let activo = true

        async function cargar() {
            if (!codigo) {
                setIndicadores([])
                setIndicadorId('')
                return
            }
            try {
                const lista = await obtenerIndicadores(codigo)
                if (!activo) return
                setIndicadores(lista)
                setIndicadorId(lista[0]?.id ?? '')
            } catch {
                if (activo) setIndicadores([])
            }
        }

        cargar()
        return () => { activo = false }
    }, [codigo])

    const indicador = indicadores.find((i) => String(i.id) === String(indicadorId))

    async function capturar() {
        if (!indicadorId) { setError('Elige un indicador'); return }
        if (!form.mes) { setError('Elige el mes de la medición'); return }
        setGuardando(true); setError(null)
        try {
            await onCapturar(Number(indicadorId), {
                mes: form.mes,
                numerador: num(form.numerador),
                denominador: num(form.denominador),
                resultado_esperado: num(form.resultado_esperado),
            })
            const lista = await obtenerIndicadores(codigo)
            setIndicadores(lista)
            setForm({ mes: '', numerador: '', denominador: '', resultado_esperado: '' })
        } catch (err) { setError(getErrorMessage(err)) }
        finally { setGuardando(false) }
    }

    if (procesos.length === 0) return (
        <Tarjeta titulo="Captura tus mediciones" descripcion="Aún no hay indicadores que medir.">
            <p className="text-sm text-gray-400">Vuelve al paso anterior y define al menos un indicador.</p>
        </Tarjeta>
    )

    return (
        <Tarjeta
            titulo="Captura tus mediciones mensuales"
            descripcion="Cada medición alimenta el semáforo, el avance T1 y las predicciones. Registra al menos dos meses para ver tendencias."
        >
            <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                    <span className="block text-xs font-semibold text-[#1e3654] mb-1">Proceso</span>
                    <select value={codigo} onChange={(e) => setCodigo(e.target.value)} className={INP}>
                        {procesos.map((p) => <option key={p.id} value={p.codigo}>{p.codigo} · {p.nombre}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className="block text-xs font-semibold text-[#1e3654] mb-1">Indicador</span>
                    <select value={indicadorId} onChange={(e) => setIndicadorId(e.target.value)} className={INP}>
                        {indicadores.length === 0 && <option value="">Sin indicadores</option>}
                        {indicadores.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                    </select>
                </label>
            </div>

            {indicador && (
                <p className="text-xs text-gray-500 bg-[#f8fafc] rounded-lg px-3 py-2">
                    Meta {indicador.meta_final ?? '—'}{indicador.unidad ? ` ${indicador.unidad}` : ''} ·
                    sentido {indicador.sentido} ·
                    <strong className="text-[#1e3654]"> {indicador.mediciones.length} medición(es) registradas</strong>
                </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <select value={form.mes} onChange={set('mes')} className={INP}>
                    <option value="">Mes…</option>
                    {MESES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <input type="number" step="any" value={form.numerador} onChange={set('numerador')} placeholder="Numerador" className={INP} />
                <input type="number" step="any" value={form.denominador} onChange={set('denominador')} placeholder="Denominador" className={INP} />
                <input type="number" step="any" value={form.resultado_esperado} onChange={set('resultado_esperado')} placeholder="Esperado" className={INP} />
            </div>

            {error && <p className="text-sm text-[#9c1d1d]">{error}</p>}

            <button onClick={capturar} disabled={guardando} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56] disabled:opacity-50">
                {guardando && <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>}
                <span className="material-symbols-outlined text-base">add</span>
                Registrar medición
            </button>

            {indicador?.mediciones.length > 0 && (
                <div className="bg-[#f8fafc] rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Mediciones de este indicador</p>
                    <ul className="space-y-1">
                        {indicador.mediciones.map((m) => (
                            <li key={m.id} className="flex items-center justify-between text-xs text-gray-600">
                                <span>{m.mes}</span>
                                <span>
                                    obtenido <strong className="text-[#1e3654]">{m.resultado_obtenido ?? '—'}</strong>
                                    {m.avance_t1 !== null && ` · avance ${m.avance_t1.toFixed(1)}%`}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Tarjeta>
    )
}

// ── Paso 6 · Listo ────────────────────────────────────────────────────────────

const SIGUIENTES_PASOS = [
    ['/tablero', 'monitoring', 'Tablero de control', 'Monitorea cada indicador contra su meta'],
    ['/anexos', 'description', 'Anexos', 'Genera y descarga los Anexos 1, 2 y 4'],
    ['/resultados', 'analytics', 'Resultados', 'Analiza resultados y aplica mejoras'],
    ['/bitacora', 'route', 'Bitácora', 'Revisa el avance de todo el trabajo'],
]

function PasoListo({ resumen, onFinalizar, finalizando, navigate }) {
    const c = resumen?.conteos ?? {}
    const items = [
        ['Procesos', c.procesos, 'account_tree'],
        ['Fichas de proceso', c.con_ficha, 'description'],
        ['Indicadores', c.indicadores, 'insights'],
        ['Mediciones', c.mediciones, 'timeline'],
    ]
    const sinMediciones = (c.mediciones ?? 0) === 0

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

            {sinMediciones && (
                <p className="flex items-center gap-2 text-sm text-[#854d0e] bg-[#fef9c3] rounded-lg px-3 py-2">
                    <span className="material-symbols-outlined text-base">info</span>
                    Sin mediciones el tablero queda vacío. Vuelve al paso 5 y registra al menos una.
                </p>
            )}

            <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">¿Y ahora qué?</p>
                <div className="grid sm:grid-cols-2 gap-2">
                    {SIGUIENTES_PASOS.map(([ruta, icono, titulo, desc]) => (
                        <button
                            key={ruta}
                            onClick={() => navigate(ruta)}
                            className="flex items-start gap-2 text-left p-3 rounded-lg border border-gray-100 hover:border-[#1e3654]/30 hover:bg-[#f8fafc] transition-colors"
                        >
                            <span className="material-symbols-outlined text-[#1e3654] text-xl shrink-0">{icono}</span>
                            <div>
                                <p className="text-sm font-medium text-[#1e3654]">{titulo}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <button onClick={onFinalizar} disabled={finalizando} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1f7a47] text-white hover:brightness-95 disabled:opacity-50">
                {finalizando && <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>}
                <span className="material-symbols-outlined text-base">dashboard</span>
                Terminar e ir al dashboard
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

    // Alta directa de un indicador propuesto por la IA, con sus campos ya resueltos
    async function handleUsarSugerencia(codigo, sugerido) {
        await guardarIndicador(codigo, {
            nombre: sugerido.nombre,
            tipo: sugerido.tipo ?? null,
            sentido: sugerido.sentido ?? 'Ascendente',
            unidad: sugerido.unidad ?? null,
            formula: sugerido.formula ?? null,
            fuente: sugerido.fuente ?? null,
            meta_final: sugerido.meta_final ?? null,
            linea_base: sugerido.linea_base ?? null,
        })
        await recargar()
        refrescar()
    }

    async function handleGuardarFicha(codigo, sipoc) {
        await guardarFicha(codigo, {
            tipo: sipoc.tipo ?? null,
            objetivo: sipoc.objetivo ?? null,
            proveedores: sipoc.proveedores ?? [],
            entradas: sipoc.entradas ?? [],
            salidas: sipoc.salidas ?? [],
            receptores: sipoc.receptores ?? [],
            actividades: sipoc.actividades ?? [],
            riesgos: sipoc.riesgos ?? [],
            registros: sipoc.registros ?? [],
        })
        await recargar()
        refrescar()
    }

    async function handleCapturarMedicion(indicadorId, medicion) {
        await capturarMedicion(indicadorId, medicion)
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

    // Un paso solo bloquea el avance cuando sin él los siguientes no tienen
    // sentido: sin procesos no hay qué caracterizar, sin indicadores no hay qué medir.
    const bloqueo =
        paso === 2 && procesos.length === 0
            ? 'Agrega al menos un proceso para continuar'
            : paso === 4 && (resumen?.conteos?.indicadores ?? 0) === 0
                ? 'Define al menos un indicador para poder capturar mediciones'
                : null

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
            {paso === 3 && <PasoFichas inventario={inventario} navigate={navigate} onGuardarFicha={handleGuardarFicha} />}
            {paso === 4 && <PasoIndicadores inventario={inventario} onCrearIndicador={handleCrearIndicador} onUsarSugerencia={handleUsarSugerencia} navigate={navigate} />}
            {paso === 5 && <PasoMediciones inventario={inventario} onCapturar={handleCapturarMedicion} />}
            {paso === 6 && <PasoListo resumen={resumen} onFinalizar={handleFinalizar} finalizando={saving} navigate={navigate} />}

            {/* Navegación */}
            {paso > 1 && (
                <div className="flex items-center justify-between">
                    <button onClick={() => setPaso((p) => Math.max(1, p - 1))} className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
                        <span className="material-symbols-outlined text-base">arrow_back</span> Atrás
                    </button>
                    {paso < ULTIMO_PASO && (
                        <button
                            onClick={() => setPaso((p) => Math.min(ULTIMO_PASO, p + 1))}
                            disabled={bloqueo !== null}
                            title={bloqueo ?? ''}
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

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import SugerenciasIA from '../../onboarding/components/SugerenciasIA'
import { pedirSipoc } from '../../../shared/services/analisisService'
import { obtenerFicha, guardarFicha, getErrorMessage } from '../services/fichaProcesoService'

const TIPOS = ['misional', 'estratégico', 'soporte']

const AYUDA = {
    tipo: 'Misional: agrega valor directo al ciudadano. Estratégico: dirige y planifica. Soporte: habilita a los demás procesos.',
    dueno: 'Responsable de que el proceso cumpla su objetivo (process owner).',
    sipoc: 'SIPOC describe la cadena del proceso: quién provee, qué entra, qué sale y quién lo recibe.',
}

const FORM_VACIO = {
    tipo: '', dueno: '', objetivo: '', objetivo_estrategico: '',
    proveedores: [], entradas: [], salidas: [], receptores: [],
    actividades: [], riesgos: [], registros: [],
    elaborado_por: '', revisado_por: '', aprobado_por: '',
}

// ── editor de lista dinámica (SIPOC, riesgos, etc.) ───────────────────────────

function EditorLista({ valores, onChange, placeholder }) {
    const items = valores.length ? valores : ['']
    const setItem = (i, v) => onChange(items.map((x, j) => (j === i ? v : x)))
    const quitar = (i) => onChange(items.filter((_, j) => j !== i))

    return (
        <div className="space-y-2">
            {items.map((valor, i) => (
                <div key={i} className="flex items-center gap-2">
                    <input
                        value={valor}
                        onChange={(e) => setItem(i, e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3654]/20"
                    />
                    <button type="button" onClick={() => quitar(i)} className="text-gray-300 hover:text-[#9c1d1d]">
                        <span className="material-symbols-outlined text-base">close</span>
                    </button>
                </div>
            ))}
            <button
                type="button"
                onClick={() => onChange([...items, ''])}
                className="flex items-center gap-1 text-xs font-medium text-[#0075ca] hover:underline"
            >
                <span className="material-symbols-outlined text-sm">add</span> Agregar
            </button>
        </div>
    )
}

function CampoTexto({ etiqueta, valor, onChange, ayuda, placeholder, textarea }) {
    return (
        <label className="block">
            <span className="block text-xs font-semibold text-[#1e3654] mb-1">{etiqueta}</span>
            {textarea ? (
                <textarea
                    value={valor} onChange={(e) => onChange(e.target.value)} rows={2} placeholder={placeholder}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3654]/20"
                />
            ) : (
                <input
                    value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3654]/20"
                />
            )}
            {ayuda && <span className="block text-xs text-gray-400 mt-1">{ayuda}</span>}
        </label>
    )
}

function Seccion({ titulo, icono, children }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#1e3654]">
                <span className="material-symbols-outlined text-base text-gray-400">{icono}</span>
                {titulo}
            </h3>
            {children}
        </div>
    )
}

// ── vista oficial (solo lectura, imprimible) ──────────────────────────────────

function Lista({ valores }) {
    if (!valores?.length) return <span className="text-gray-300">—</span>
    return <ul className="list-disc list-inside space-y-0.5">{valores.map((v, i) => <li key={i}>{v}</li>)}</ul>
}

function Fila({ label, children }) {
    return (
        <div className="grid grid-cols-3 gap-2 py-2 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
            <div className="col-span-2 text-sm text-gray-800">{children || <span className="text-gray-300">—</span>}</div>
        </div>
    )
}

function VistaOficial({ ficha }) {
    return (
        <div className="zona-imprimible bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-1">
            <div className="text-center border-b-2 border-[#1e3654] pb-3 mb-3">
                <p className="font-bold text-[#1e3654]">FICHA DE PRODUCTO Y PROCESO — ANEXO 2</p>
                <p className="text-xs text-gray-500">Norma Técnica N° 002-2025-PCM-SGP</p>
            </div>
            <Fila label="Código">{ficha.codigo}</Fila>
            <Fila label="Proceso">{ficha.nombre_proceso}</Fila>
            <Fila label="Producto">{ficha.producto}</Fila>
            <Fila label="Tipo">{ficha.tipo}</Fila>
            <Fila label="Dueño">{ficha.dueno}</Fila>
            <Fila label="Objetivo">{ficha.objetivo}</Fila>
            <Fila label="Objetivo estratégico">{ficha.objetivo_estrategico}</Fila>
            <Fila label="Proveedores"><Lista valores={ficha.proveedores} /></Fila>
            <Fila label="Entradas"><Lista valores={ficha.entradas} /></Fila>
            <Fila label="Salidas / Producto"><Lista valores={ficha.salidas} /></Fila>
            <Fila label="Receptores"><Lista valores={ficha.receptores} /></Fila>
            <Fila label="Actividades (PDCA)"><Lista valores={ficha.actividades} /></Fila>
            <Fila label="Riesgos"><Lista valores={ficha.riesgos} /></Fila>
            <Fila label="Registros"><Lista valores={ficha.registros} /></Fila>
            <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs text-gray-600">
                <div className="border-t border-gray-300 pt-1">Elaborado por<br /><strong>{ficha.elaborado_por || '—'}</strong></div>
                <div className="border-t border-gray-300 pt-1">Revisado por<br /><strong>{ficha.revisado_por || '—'}</strong></div>
                <div className="border-t border-gray-300 pt-1">Aprobado por<br /><strong>{ficha.aprobado_por || '—'}</strong></div>
            </div>
        </div>
    )
}

// ── página ────────────────────────────────────────────────────────────────────

export default function FichaProcesoPage() {
    const { codigo } = useParams()
    const navigate = useNavigate()
    const [ficha, setFicha] = useState(null)
    const [form, setForm] = useState(FORM_VACIO)
    const [modo, setModo] = useState('vista')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        let isMounted = true
        async function cargar() {
            try {
                const data = await obtenerFicha(codigo)
                if (!isMounted) return
                setFicha(data)
                setForm({ ...FORM_VACIO, ...limpiar(data) })
                setModo(data.tiene_ficha ? 'vista' : 'editar')
                setError(null)
            } catch (err) {
                if (isMounted) setError(getErrorMessage(err))
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }
        cargar()
        return () => { isMounted = false }
    }, [codigo])

    const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }))

    // Vuelca la propuesta de la IA en el formulario sin pisar lo ya escrito:
    // solo rellena los campos que el usuario aún tiene vacíos. Nada se guarda
    // solo; el usuario revisa y confirma con "Guardar ficha".
    function usarSugerenciaSipoc(sug) {
        const lista = (campo, propuesto) => (form[campo]?.length ? form[campo] : (propuesto || []))
        setForm((f) => ({
            ...f,
            tipo: f.tipo || sug.tipo || '',
            objetivo: f.objetivo || sug.objetivo || '',
            proveedores: lista('proveedores', sug.proveedores),
            entradas: lista('entradas', sug.entradas),
            salidas: lista('salidas', sug.salidas),
            receptores: lista('receptores', sug.receptores),
            actividades: lista('actividades', sug.actividades),
            riesgos: lista('riesgos', sug.riesgos),
            registros: lista('registros', sug.registros),
        }))
    }

    async function handleGuardar() {
        if (saving) return
        setSaving(true)
        setError(null)
        try {
            const data = await guardarFicha(codigo, form)
            setFicha(data)
            setForm({ ...FORM_VACIO, ...limpiar(data) })
            setModo('vista')
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Cargando ficha…
        </div>
    )

    if (error && !ficha) return (
        <div className="flex items-center gap-2 p-6 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl">
            <span className="material-symbols-outlined">error</span>
            {error}
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Encabezado */}
            <div className="flex items-start justify-between gap-4 flex-wrap no-print">
                <div>
                    <button onClick={() => navigate('/inventario')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#1e3654] mb-1">
                        <span className="material-symbols-outlined text-sm">arrow_back</span> Inventario
                    </button>
                    <h1 className="text-2xl font-bold text-[#1e3654]">
                        Ficha de Proceso · <span className="font-mono">{ficha.codigo}</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Anexo 2 · {ficha.nombre_proceso}</p>
                </div>
                <div className="flex items-center gap-2">
                    {modo === 'vista' ? (
                        <>
                            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-[#1e3654] border border-gray-200 hover:bg-gray-50">
                                <span className="material-symbols-outlined text-base">print</span> Imprimir
                            </button>
                            <button onClick={() => setModo('editar')} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56]">
                                <span className="material-symbols-outlined text-base">edit</span> Editar
                            </button>
                        </>
                    ) : (
                        <>
                            {ficha.tiene_ficha && (
                                <button onClick={() => { setForm({ ...FORM_VACIO, ...limpiar(ficha) }); setModo('vista') }} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
                                    Cancelar
                                </button>
                            )}
                            <button onClick={handleGuardar} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#1e3654] text-white hover:bg-[#0c2f56] disabled:opacity-50">
                                {saving && <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>}
                                Guardar ficha
                            </button>
                        </>
                    )}
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 bg-[#ffe8e8] text-[#9c1d1d] rounded-xl text-sm no-print">
                    <span className="material-symbols-outlined text-base">error</span> {error}
                </div>
            )}

            {modo === 'vista' ? (
                <VistaOficial ficha={ficha} />
            ) : (
                <div className="space-y-4">
                    <SugerenciasIA
                        titulo="Completar la ficha con IA"
                        descripcion="La IA propone un SIPOC inicial a partir del proceso; revísalo y ajústalo antes de guardar."
                        textoBoton="Proponer SIPOC"
                        onPedir={() => pedirSipoc(codigo)}
                    >
                        {({ resultado, cerrar }) => (
                            <div className="space-y-3">
                                <div className="grid sm:grid-cols-2 gap-2 text-xs text-gray-600">
                                    {[
                                        ['Proveedores', resultado.proveedores],
                                        ['Entradas', resultado.entradas],
                                        ['Salidas', resultado.salidas],
                                        ['Receptores', resultado.receptores],
                                    ].map(([etiqueta, items]) => (
                                        <p key={etiqueta}>
                                            <span className="font-semibold text-[#1e3654]">{etiqueta}:</span>{' '}
                                            {(items || []).join(', ') || '—'}
                                        </p>
                                    ))}
                                </div>
                                <button
                                    onClick={() => { usarSugerenciaSipoc(resultado); cerrar() }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1f7a47] text-white hover:bg-[#186139]"
                                >
                                    <span className="material-symbols-outlined text-sm">check</span>
                                    Usar esta propuesta
                                </button>
                            </div>
                        )}
                    </SugerenciasIA>

                    <Seccion titulo="Datos generales" icono="badge">
                        <label className="block">
                            <span className="block text-xs font-semibold text-[#1e3654] mb-1">Tipo de proceso</span>
                            <select
                                value={form.tipo} onChange={(e) => set('tipo')(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3654]/20"
                            >
                                <option value="">Seleccionar…</option>
                                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <span className="block text-xs text-gray-400 mt-1">{AYUDA.tipo}</span>
                        </label>
                        <CampoTexto etiqueta="Dueño del proceso" valor={form.dueno} onChange={set('dueno')} ayuda={AYUDA.dueno} />
                        <CampoTexto etiqueta="Objetivo del proceso" valor={form.objetivo} onChange={set('objetivo')} textarea />
                        <CampoTexto etiqueta="Objetivo estratégico" valor={form.objetivo_estrategico} onChange={set('objetivo_estrategico')} textarea />
                    </Seccion>

                    <Seccion titulo="SIPOC" icono="account_tree">
                        <p className="text-xs text-gray-400 -mt-2">{AYUDA.sipoc}</p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div><p className="text-xs font-semibold text-[#1e3654] mb-1">Proveedores</p><EditorLista valores={form.proveedores} onChange={set('proveedores')} placeholder="Quién provee la entrada" /></div>
                            <div><p className="text-xs font-semibold text-[#1e3654] mb-1">Entradas</p><EditorLista valores={form.entradas} onChange={set('entradas')} placeholder="Insumo que ingresa" /></div>
                            <div><p className="text-xs font-semibold text-[#1e3654] mb-1">Salidas / Producto</p><EditorLista valores={form.salidas} onChange={set('salidas')} placeholder="Producto que sale" /></div>
                            <div><p className="text-xs font-semibold text-[#1e3654] mb-1">Receptores</p><EditorLista valores={form.receptores} onChange={set('receptores')} placeholder="Quién recibe el producto" /></div>
                        </div>
                    </Seccion>

                    <Seccion titulo="Actividades (ciclo P-D-C-A)" icono="checklist">
                        <EditorLista valores={form.actividades} onChange={set('actividades')} placeholder="Planificar / Hacer / Verificar / Actuar" />
                    </Seccion>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <Seccion titulo="Riesgos" icono="warning"><EditorLista valores={form.riesgos} onChange={set('riesgos')} placeholder="Riesgo identificado" /></Seccion>
                        <Seccion titulo="Registros" icono="folder"><EditorLista valores={form.registros} onChange={set('registros')} placeholder="Documento o registro generado" /></Seccion>
                    </div>

                    <Seccion titulo="Firmas" icono="draw">
                        <div className="grid sm:grid-cols-3 gap-4">
                            <CampoTexto etiqueta="Elaborado por" valor={form.elaborado_por} onChange={set('elaborado_por')} />
                            <CampoTexto etiqueta="Revisado por" valor={form.revisado_por} onChange={set('revisado_por')} />
                            <CampoTexto etiqueta="Aprobado por" valor={form.aprobado_por} onChange={set('aprobado_por')} />
                        </div>
                    </Seccion>
                </div>
            )}
        </div>
    )
}

// Solo los campos editables; descarta metadatos (codigo, nombre_proceso, etc.)
function limpiar(data) {
    const salida = {}
    for (const campo of Object.keys(FORM_VACIO)) {
        if (data[campo] != null) salida[campo] = data[campo]
    }
    return salida
}

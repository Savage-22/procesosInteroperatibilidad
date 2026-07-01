import { useEffect, useRef, useState } from 'react'
import httpClient from '../../infrastructure/httpClient'

const SUGERENCIAS = [
    '¿Qué proceso necesita atención urgente?',
    '¿Cómo completo correctamente la guía CEPLAN?',
    'Dame recomendaciones para los procesos en rojo',
    '¿Qué indica el semáforo amarillo en la guía?',
]

function IcoChat() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97Z" clipRule="evenodd" />
        </svg>
    )
}

function IcoCerrar() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
    )
}

function IcoEnviar() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
        </svg>
    )
}

function Typing() {
    return (
        <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm shadow-sm px-4 py-3">
                <span className="flex gap-1 items-center">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
            </div>
        </div>
    )
}

export default function ChatWidget() {
    const [abierto, setAbierto] = useState(false)
    const [mensajes, setMensajes] = useState([
        {
            rol: 'asistente',
            contenido: '¡Hola! Soy el Asistente IA de SIIP. Estoy aquí para ayudarte a completar y hacer seguimiento de la Guía CEPLAN N°0056-2024 sobre interoperabilidad de servicios públicos.\n\nPuedo analizar el estado de tus procesos, identificar brechas, orientarte sobre los criterios de la directiva y darte recomendaciones concretas de mejora. ¿En qué te ayudo?',
        },
    ])
    const [entrada, setEntrada] = useState('')
    const [cargando, setCargando] = useState(false)
    const listaRef = useRef(null)
    const inputRef = useRef(null)

    useEffect(() => {
        if (listaRef.current) {
            listaRef.current.scrollTop = listaRef.current.scrollHeight
        }
    }, [mensajes, cargando])

    useEffect(() => {
        if (abierto && inputRef.current) {
            inputRef.current.focus()
        }
    }, [abierto])

    async function enviar(texto) {
        const msg = (texto ?? entrada).trim()
        if (!msg || cargando) return
        setEntrada('')

        const historialActual = [...mensajes]
        setMensajes(prev => [...prev, { rol: 'user', contenido: msg }])
        setCargando(true)

        try {
            const { data } = await httpClient.post('/api/chat', {
                mensaje: msg,
                historial: historialActual.slice(-8),
            })
            setMensajes(prev => [...prev, { rol: 'asistente', contenido: data.data.respuesta }])
        } catch (err) {
            const detalle = err.response?.data?.detail ?? 'Error al conectar con el asistente.'
            setMensajes(prev => [...prev, { rol: 'asistente', contenido: `⚠️ ${detalle}` }])
        } finally {
            setCargando(false)
        }
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {abierto && (
                <div
                    className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
                    style={{ height: '480px' }}
                >
                    {/* Header */}
                    <div className="bg-blue-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2 text-white">
                            <span className="text-xl">🤖</span>
                            <div>
                                <p className="font-semibold text-sm leading-tight">Asistente SIIP</p>
                                <p className="text-blue-200 text-xs">Guía CEPLAN N°0056-2024</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setAbierto(false)}
                            className="text-blue-200 hover:text-white transition-colors"
                            aria-label="Cerrar chat"
                        >
                            <IcoCerrar />
                        </button>
                    </div>

                    {/* Messages */}
                    <div ref={listaRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50">
                        {mensajes.map((m, i) => (
                            <div key={i} className={`flex ${m.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                        m.rol === 'user'
                                            ? 'bg-blue-600 text-white rounded-br-sm'
                                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                                    }`}
                                >
                                    {m.contenido}
                                </div>
                            </div>
                        ))}

                        {cargando && <Typing />}

                        {/* Sugerencias — solo antes del primer mensaje del usuario */}
                        {mensajes.length === 1 && !cargando && (
                            <div className="flex flex-col gap-1.5 mt-2">
                                {SUGERENCIAS.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => enviar(s)}
                                        className="text-left text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl px-3 py-2 transition-colors"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="border-t border-gray-200 p-3 bg-white flex-shrink-0">
                        <form
                            onSubmit={e => { e.preventDefault(); enviar() }}
                            className="flex gap-2"
                        >
                            <input
                                ref={inputRef}
                                value={entrada}
                                onChange={e => setEntrada(e.target.value)}
                                placeholder="Escribe tu pregunta..."
                                disabled={cargando}
                                className="flex-1 text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                            />
                            <button
                                type="submit"
                                disabled={!entrada.trim() || cargando}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl px-3 py-2 transition-colors"
                                aria-label="Enviar"
                            >
                                <IcoEnviar />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Botón flotante */}
            <button
                onClick={() => setAbierto(prev => !prev)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
                aria-label="Abrir asistente IA"
                title="Asistente IA"
            >
                {abierto ? <IcoCerrar /> : <IcoChat />}
            </button>
        </div>
    )
}

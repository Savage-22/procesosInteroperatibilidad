"""
Cliente único del proveedor de IA (DeepSeek, compatible con el SDK de OpenAI).

Todos los módulos que consultan a la IA —el chat y los análisis por sección—
pasan por aquí, para que la configuración, el manejo de errores y el modelo
vivan en un solo lugar. Los servicios llaman a `completar` / `completar_json`
y traducen `ErrorIA` a su respuesta HTTP.
"""

import json
import logging
import os
import re

from openai import OpenAI

logger = logging.getLogger(__name__)

MODELO = "deepseek-chat"
BASE_URL = "https://api.deepseek.com"


class ErrorIA(Exception):
    """Fallo al contactar al proveedor de IA. El router lo traduce a HTTP 502."""


class IANoConfigurada(ErrorIA):
    """No hay API key configurada. El router lo traduce a HTTP 503."""


def disponible() -> bool:
    """True si hay credenciales para usar la IA. Permite degradar la UI sin errores."""
    return bool(os.getenv("DEEPSEEK_API_KEY"))


def _cliente() -> OpenAI:
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise IANoConfigurada("El asistente IA no está configurado. Contacta al administrador.")
    return OpenAI(api_key=api_key, base_url=BASE_URL)


def completar(
    system: str,
    mensajes: list[dict],
    max_tokens: int = 800,
    temperature: float = 0.7,
) -> str:
    """
    Envía la conversación y devuelve el texto de la respuesta.
    `mensajes` usa el formato del SDK: [{"role": "user", "content": "…"}].
    """
    cliente = _cliente()
    try:
        respuesta = cliente.chat.completions.create(
            model=MODELO,
            messages=[{"role": "system", "content": system}, *mensajes],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return respuesta.choices[0].message.content or ""
    except ErrorIA:
        raise
    except Exception as e:
        logger.error("Error llamando a la IA: %s", e)
        raise ErrorIA("Error al contactar el servicio de IA.") from e


def completar_json(
    system: str,
    prompt: str,
    max_tokens: int = 900,
    temperature: float = 0.3,
) -> dict | list:
    """
    Igual que `completar`, pero espera JSON de vuelta. Temperatura baja porque
    aquí interesa la estructura, no la redacción. Tolera que el modelo envuelva
    el JSON en un bloque de código markdown.
    """
    texto = completar(
        f"{system}\n\nResponde ÚNICAMENTE con JSON válido, sin texto adicional.",
        [{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return _extraer_json(texto)


def _extraer_json(texto: str) -> dict | list:
    limpio = texto.strip()
    # El modelo suele devolver ```json … ```; nos quedamos con el contenido.
    bloque = re.search(r"```(?:json)?\s*(.*?)```", limpio, re.DOTALL)
    if bloque:
        limpio = bloque.group(1).strip()
    try:
        return json.loads(limpio)
    except json.JSONDecodeError as e:
        logger.error("La IA devolvió un JSON inválido: %s", limpio[:200])
        raise ErrorIA("La IA devolvió una respuesta con formato inesperado.") from e

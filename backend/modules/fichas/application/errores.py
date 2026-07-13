class ErrorValidacion(Exception):
    """
    Regla de negocio incumplida (código duplicado, nivel incoherente, etc.).
    El router la traduce a HTTP 400 con el mensaje para mostrarlo al usuario.
    """


class ErrorNoEncontrado(Exception):
    """Recurso inexistente. El router la traduce a HTTP 404."""

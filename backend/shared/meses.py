ORDEN_MESES: dict[str, int] = {
    "Enero": 1,
    "Febrero": 2,
    "Marzo": 3,
    "Abril": 4,
    "Mayo": 5,
    "Junio": 6,
    "Julio": 7,
    "Agosto": 8,
    "Septiembre": 9,
    "Setiembre": 9,  # variante usada en Perú
    "Octubre": 10,
    "Noviembre": 11,
    "Diciembre": 12,
}


def orden_mes(mes: str) -> int:
    """Devuelve el número de orden de un mes para uso como key de ordenamiento."""
    return ORDEN_MESES.get(mes, 99)


def ordenar_por_mes(registros: list[dict], campo: str = "mes") -> list[dict]:
    """Ordena una lista de registros cronológicamente por el campo mes."""
    return sorted(registros, key=lambda r: orden_mes(r[campo]))

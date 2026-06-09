def calcular_semaforo(avance_t1: float | None) -> str:
    """
    Clasifica el avance T1 según la Directiva CEPLAN N° 0056-2024.
    Verde [95-100], Amarillo [75-95), Rojo [0-75).
    """
    if avance_t1 is None:
        return "Sin datos"
    if avance_t1 >= 95:
        return "Verde"
    if avance_t1 >= 75:
        return "Amarillo"
    return "Rojo"

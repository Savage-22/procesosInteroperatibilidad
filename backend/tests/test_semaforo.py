from shared.semaforo import calcular_semaforo


def test_verde_en_borde_95():
    assert calcular_semaforo(95) == "Verde"


def test_verde_en_100():
    assert calcular_semaforo(100) == "Verde"


def test_amarillo_justo_bajo_95():
    assert calcular_semaforo(94.99) == "Amarillo"


def test_amarillo_en_borde_75():
    assert calcular_semaforo(75) == "Amarillo"


def test_rojo_justo_bajo_75():
    assert calcular_semaforo(74.99) == "Rojo"


def test_rojo_en_cero():
    assert calcular_semaforo(0) == "Rojo"


def test_sin_datos_con_none():
    assert calcular_semaforo(None) == "Sin datos"

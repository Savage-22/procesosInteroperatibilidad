from shared.meses import orden_mes, ordenar_por_mes


def test_orden_mes_conocido():
    assert orden_mes("Enero") == 1
    assert orden_mes("Diciembre") == 12


def test_orden_mes_desconocido_va_al_final():
    assert orden_mes("NoExiste") == 99


def test_ordenar_por_mes_cronologico():
    registros = [{"mes": "Marzo"}, {"mes": "Enero"}, {"mes": "Febrero"}]
    ordenados = ordenar_por_mes(registros)
    assert [r["mes"] for r in ordenados] == ["Enero", "Febrero", "Marzo"]


def test_ordenar_por_mes_desconocido_al_final():
    registros = [{"mes": "Raro"}, {"mes": "Abril"}]
    ordenados = ordenar_por_mes(registros)
    assert [r["mes"] for r in ordenados] == ["Abril", "Raro"]

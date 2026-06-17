from modules.procesos.application.proceso_service import ProcesoService


def _registro(mes, obtenido, esperado, meta_final=100.0, es_descendente=False):
    return {
        "codigo_proceso": "M1.1",
        "proceso": "Proceso de prueba",
        "modulo": "M1",
        "mes": mes,
        "resultado_obtenido": obtenido,
        "resultado_esperado": esperado,
        "meta_final": meta_final,
        "es_descendente": es_descendente,
    }


# ------------------------------------------------------------------ #
# calcular_avance_t1                                                  #
# ------------------------------------------------------------------ #

def test_avance_ascendente_simple():
    assert ProcesoService.calcular_avance_t1(80, 100, False) == 80.0


def test_avance_ascendente_tope_100():
    assert ProcesoService.calcular_avance_t1(120, 100, False) == 100.0


def test_avance_descendente_cumple_meta():
    # Menor es mejor: si obtenido ≤ esperado el avance es 100
    assert ProcesoService.calcular_avance_t1(15, 20, True) == 100.0


def test_avance_descendente_no_cumple():
    assert ProcesoService.calcular_avance_t1(40, 20, True) == 50.0


def test_avance_con_none():
    assert ProcesoService.calcular_avance_t1(None, 100, False) is None
    assert ProcesoService.calcular_avance_t1(80, None, False) is None


def test_avance_esperado_cero():
    assert ProcesoService.calcular_avance_t1(80, 0, False) is None


# ------------------------------------------------------------------ #
# calcular_brecha                                                     #
# ------------------------------------------------------------------ #

def test_brecha_usa_ultimo_mes_cronologico():
    registros = [
        _registro("Marzo", 70, 80),
        _registro("Enero", 50, 60),
    ]
    # Último mes cronológico es Marzo: 100 − 70
    assert ProcesoService.calcular_brecha(registros) == 30.0


def test_brecha_sin_registros():
    assert ProcesoService.calcular_brecha([]) is None


def test_brecha_con_datos_faltantes():
    registros = [_registro("Enero", None, 60)]
    assert ProcesoService.calcular_brecha(registros) is None


# ------------------------------------------------------------------ #
# calcular_promedios                                                  #
# ------------------------------------------------------------------ #

def test_promedios_basicos():
    registros = [
        _registro("Enero", 80, 100),
        _registro("Febrero", 90, 100),
    ]
    promedios = ProcesoService.calcular_promedios(registros)
    assert promedios["promedio_resultado_obtenido"] == 85.0
    assert promedios["promedio_avance_t1"] == 85.0


def test_promedios_ignora_none():
    registros = [
        _registro("Enero", 80, 100),
        _registro("Febrero", None, 100),
    ]
    promedios = ProcesoService.calcular_promedios(registros)
    assert promedios["promedio_resultado_obtenido"] == 80.0


def test_promedios_sin_datos():
    promedios = ProcesoService.calcular_promedios([_registro("Enero", None, None)])
    assert promedios["promedio_resultado_obtenido"] is None
    assert promedios["promedio_avance_t1"] is None


# ------------------------------------------------------------------ #
# calcular_pareto                                                     #
# ------------------------------------------------------------------ #

def test_pareto_ordena_por_brecha_descendente():
    registros = [
        {**_registro("Enero", 90, 100), "codigo_proceso": "M1.1"},
        {**_registro("Enero", 50, 100), "codigo_proceso": "M1.2"},
    ]
    items = ProcesoService.calcular_pareto(registros)
    assert [i["codigo"] for i in items] == ["M1.2", "M1.1"]
    assert items[0]["brecha_pareto"] == 50.0


def test_pareto_acumulado_llega_a_100():
    registros = [
        {**_registro("Enero", 90, 100), "codigo_proceso": "M1.1"},
        {**_registro("Enero", 50, 100), "codigo_proceso": "M1.2"},
    ]
    items = ProcesoService.calcular_pareto(registros)
    assert items[-1]["porcentaje_acumulado"] == 100.0


def test_pareto_descendente_brecha_positiva_si_excede_meta():
    # Indicador "menor es mejor": obtenido 35 vs esperado 20 → avance 57.14 → brecha 42.86
    registros = [
        {**_registro("Enero", 35, 20, meta_final=20, es_descendente=True), "codigo_proceso": "M2.2"},
    ]
    items = ProcesoService.calcular_pareto(registros)
    assert items[0]["brecha_pareto"] == 42.86


def test_pareto_adelantado_al_plan_sin_brecha():
    # Obtenido 77 supera lo esperado a la fecha (75) aunque la meta anual sea 90:
    # el proceso va adelantado y no debe aparecer como crítico
    registros = [
        {**_registro("Mayo", 77, 75, meta_final=90), "codigo_proceso": "M1.1"},
    ]
    items = ProcesoService.calcular_pareto(registros)
    assert items[0]["brecha_pareto"] == 0.0


def test_pareto_sin_datos_brecha_cero():
    registros = [
        {**_registro("Enero", None, None), "codigo_proceso": "M1.9"},
    ]
    items = ProcesoService.calcular_pareto(registros)
    assert items[0]["brecha_pareto"] == 0.0
    assert items[0]["semaforo"] == "Sin datos"


def test_pareto_descendente_sin_brecha_si_cumple():
    registros = [
        {**_registro("Enero", 10, 20, meta_final=20, es_descendente=True), "codigo_proceso": "M2.2"},
    ]
    items = ProcesoService.calcular_pareto(registros)
    assert items[0]["brecha_pareto"] == 0.0


def test_pareto_sin_brecha_total_no_divide_por_cero():
    registros = [
        {**_registro("Enero", 100, 100), "codigo_proceso": "M1.1"},
    ]
    items = ProcesoService.calcular_pareto(registros)
    assert items[0]["porcentaje_acumulado"] == 100.0


# ------------------------------------------------------------------ #
# calcular_prediccion                                                 #
# ------------------------------------------------------------------ #

def test_prediccion_necesita_dos_meses():
    assert ProcesoService.calcular_prediccion([_registro("Enero", 50, 60)]) is None


def test_prediccion_sin_datos_obtenidos():
    registros = [_registro("Enero", None, 60), _registro("Febrero", None, 70)]
    assert ProcesoService.calcular_prediccion(registros) is None


def test_prediccion_tendencia_lineal_perfecta():
    # +10 por mes: Enero 50 … Mayo 90 → diciembre proyectado se acota a 100
    registros = [
        _registro("Enero", 50, 50, meta_final=90),
        _registro("Febrero", 60, 60, meta_final=90),
        _registro("Marzo", 70, 70, meta_final=90),
        _registro("Abril", 80, 80, meta_final=90),
        _registro("Mayo", 90, 90, meta_final=90),
    ]
    pred = ProcesoService.calcular_prediccion(registros)
    assert pred["pendiente"] == 10.0
    assert pred["tendencia"] == "ascendente"
    assert pred["r_cuadrado"] == 1.0
    # Junio (mes 6) sería 100; se acota al tope porcentual
    assert pred["valor_diciembre"] == 100.0
    assert pred["alcanzara_meta"] is True
    # La recta (40 + 10·mes) cruza la meta 90 en el mes 5 → Mayo
    assert pred["mes_alcanza_meta"] == "Mayo"
    # La proyección arranca en el mes siguiente al último con datos
    assert pred["proyeccion"][0]["mes"] == "Junio"
    assert pred["proyeccion"][-1]["mes"] == "Diciembre"
    assert len(pred["historico"]) == 5


def test_prediccion_estancada_no_alcanza_meta():
    # Plano en 60 con meta 90: nunca llega
    registros = [
        _registro("Enero", 60, 60, meta_final=90),
        _registro("Febrero", 60, 70, meta_final=90),
        _registro("Marzo", 60, 80, meta_final=90),
    ]
    pred = ProcesoService.calcular_prediccion(registros)
    assert pred["tendencia"] == "estable"
    assert pred["valor_diciembre"] == 60.0
    assert pred["alcanzara_meta"] is False
    assert pred["mes_alcanza_meta"] is None


def test_prediccion_descendente_compara_al_reves():
    # "Menor es mejor": baja de 30 a 22 días, meta ≤ 20
    registros = [
        _registro("Enero", 30, 25, meta_final=20, es_descendente=True),
        _registro("Febrero", 26, 23, meta_final=20, es_descendente=True),
        _registro("Marzo", 22, 21, meta_final=20, es_descendente=True),
    ]
    pred = ProcesoService.calcular_prediccion(registros)
    assert pred["tendencia"] == "descendente"
    # Proyección de días no se acota a 100
    assert pred["valor_diciembre"] < 20
    assert pred["alcanzara_meta"] is True


def test_prediccion_un_solo_mes_repetido():
    # Dos registros en el mismo mes → sin eje temporal, no hay tendencia
    registros = [_registro("Enero", 50, 60), _registro("Enero", 70, 60)]
    assert ProcesoService.calcular_prediccion(registros) is None

from shared.meses import mes_por_orden, orden_mes, ordenar_por_mes
from shared.semaforo import calcular_semaforo

# Pendiente (cambio por mes) por debajo de la cual la tendencia se
# considera plana: medio punto porcentual mensual es ruido, no tendencia.
_UMBRAL_ESTABLE = 0.5

MES_DICIEMBRE = 12


class ProcesoService:

    # ------------------------------------------------------------------ #
    # Issue #7 — AVANCE T1                                                #
    # ------------------------------------------------------------------ #

    @staticmethod
    def calcular_avance_t1(
        resultado_obtenido: float | None,
        resultado_esperado: float | None,
        es_descendente: bool,
    ) -> float | None:
        if resultado_obtenido is None or resultado_esperado is None:
            return None
        if resultado_esperado == 0:
            return None

        if es_descendente:
            # Menor es mejor (ej: M2.2 ≤ 20 días). Si cumple la meta → 100.
            if resultado_obtenido <= resultado_esperado:
                return 100.0
            return round((resultado_esperado / resultado_obtenido) * 100, 4)

        avance = (resultado_obtenido / resultado_esperado) * 100
        return round(min(avance, 100.0), 4)

    # ------------------------------------------------------------------ #
    # Issue #8 — Brecha vs meta final                                     #
    # ------------------------------------------------------------------ #

    @staticmethod
    def calcular_brecha(registros: list[dict]) -> float | None:
        """
        Brecha = meta_final − resultado_obtenido del último mes.
        Positivo = proceso por debajo de su meta.
        Para indicadores descendentes positivo no implica problema,
        pero el Pareto usa brecha_pareto (ver calcular_pareto).
        """
        if not registros:
            return None

        ultimo = ordenar_por_mes(registros)[-1]
        meta_final = ultimo.get("meta_final")
        obtenido = ultimo.get("resultado_obtenido")

        if meta_final is None or obtenido is None:
            return None

        return round(meta_final - obtenido, 4)

    # ------------------------------------------------------------------ #
    # Issue #9 — Promedios de diagnóstico                                 #
    # ------------------------------------------------------------------ #

    @staticmethod
    def calcular_promedios(registros: list[dict]) -> dict:
        """
        Usa avance_t1 recalculado (no el del Excel) para garantizar
        correctitud, especialmente en M2.2 donde el Excel es incorrecto.
        """
        valores_obtenido = [
            r["resultado_obtenido"]
            for r in registros
            if r.get("resultado_obtenido") is not None
        ]

        valores_avance = [
            ProcesoService.calcular_avance_t1(
                r.get("resultado_obtenido"),
                r.get("resultado_esperado"),
                r.get("es_descendente", False),
            )
            for r in registros
        ]
        valores_avance = [v for v in valores_avance if v is not None]

        return {
            "promedio_resultado_obtenido": (
                round(sum(valores_obtenido) / len(valores_obtenido), 2)
                if valores_obtenido
                else None
            ),
            "promedio_avance_t1": (
                round(sum(valores_avance) / len(valores_avance), 2)
                if valores_avance
                else None
            ),
        }

    # ------------------------------------------------------------------ #
    # Predicción de tendencia hasta diciembre                             #
    # ------------------------------------------------------------------ #

    @staticmethod
    def calcular_prediccion(registros: list[dict]) -> dict | None:
        """
        Proyecta el resultado obtenido hasta diciembre mediante una
        regresión lineal por mínimos cuadrados sobre los meses reportados.

        Devuelve None si hay menos de 2 meses con datos (no se puede
        trazar una tendencia). El valor proyectado se acota a un rango
        razonable según la unidad: [0, 100] para porcentajes y [0, ∞)
        para indicadores en otra unidad (ej. días).
        """
        es_descendente = registros[0].get("es_descendente", False)
        meta_final = registros[0].get("meta_final")

        # Puntos (orden_mes, valor) únicos y ordenados cronológicamente
        puntos = sorted({
            (orden_mes(r["mes"]), r["resultado_obtenido"])
            for r in registros
            if r.get("resultado_obtenido") is not None and orden_mes(r["mes"]) <= MES_DICIEMBRE
        })

        if len(puntos) < 2:
            return None

        n = len(puntos)
        xs = [p[0] for p in puntos]
        ys = [p[1] for p in puntos]
        media_x = sum(xs) / n
        media_y = sum(ys) / n
        sxx = sum((x - media_x) ** 2 for x in xs)
        sxy = sum((x - media_x) * (y - media_y) for x, y in zip(xs, ys))

        # Todos los datos en el mismo mes: sin eje temporal, no hay tendencia
        if sxx == 0:
            return None

        pendiente = sxy / sxx
        intercepto = media_y - pendiente * media_x

        # R²: qué tanto explican los meses la variación del resultado (0-1)
        syy = sum((y - media_y) ** 2 for y in ys)
        r_cuadrado = (sxy ** 2) / (sxx * syy) if syy > 0 else 1.0

        def proyectar(x: int) -> float:
            valor = intercepto + pendiente * x
            if es_descendente:
                return round(max(valor, 0.0), 2)
            return round(min(max(valor, 0.0), 100.0), 2)

        ultimo_mes = max(xs)
        proyeccion = [
            {"mes": mes_por_orden(x), "valor": proyectar(x)}
            for x in range(ultimo_mes + 1, MES_DICIEMBRE + 1)
        ]

        valor_diciembre = proyectar(MES_DICIEMBRE)

        # Mes (1-12) en que la recta cruza la meta por primera vez. Se usa la
        # recta sin acotar para no perder el cruce por el tope del 100%.
        mes_alcanza_meta = None
        if meta_final is not None:
            for x in range(1, MES_DICIEMBRE + 1):
                valor = intercepto + pendiente * x
                cumple = valor <= meta_final if es_descendente else valor >= meta_final
                if cumple:
                    mes_alcanza_meta = mes_por_orden(x)
                    break

        if meta_final is None:
            alcanzara_meta = None
        elif es_descendente:
            alcanzara_meta = valor_diciembre <= meta_final
        else:
            alcanzara_meta = valor_diciembre >= meta_final

        if abs(pendiente) < _UMBRAL_ESTABLE:
            tendencia = "estable"
        elif pendiente > 0:
            tendencia = "ascendente"
        else:
            tendencia = "descendente"

        return {
            "pendiente": round(pendiente, 3),
            "tendencia": tendencia,
            "r_cuadrado": round(r_cuadrado, 3),
            "meses_con_datos": n,
            "valor_diciembre": valor_diciembre,
            "meta_final": meta_final,
            "alcanzara_meta": alcanzara_meta,
            "mes_alcanza_meta": mes_alcanza_meta,
            "es_descendente": es_descendente,
            "historico": [
                {"mes": mes_por_orden(x), "valor": round(y, 2)} for x, y in puntos
            ],
            "proyeccion": proyeccion,
        }

    # ------------------------------------------------------------------ #
    # Ponderación por relevancia — Tabla A5 Directiva N°0056-2024-CEPLAN #
    # ------------------------------------------------------------------ #

    @staticmethod
    def calcular_ponderadores(relevancia_por_codigo: dict[str, int]) -> dict[str, float]:
        """
        Calcula el ponderador de cada indicador dentro de un elemento (módulo)
        usando la fórmula de la Tabla A5:
            w_k = (R_min - (R_k - 1)) / Σᵢ(R_min - (R_i - 1))

        R_min es la relevancia mínima entre todos los indicadores del elemento.
        Cuando el módulo tiene un solo indicador su ponderador es 1.0 (Criterio 1).
        """
        if not relevancia_por_codigo:
            return {}

        # R_min = grado de relevancia más baja (= mayor valor numérico, ya que R=3 < R=1)
        # Según Tabla A5: con {R=1, R=2} → R_min=2; con {R=1,2,3} → R_min=3
        r_min = max(relevancia_por_codigo.values())
        pesos_brutos = {
            codigo: r_min - (r - 1)
            for codigo, r in relevancia_por_codigo.items()
        }
        total = sum(pesos_brutos.values())
        if total == 0:
            n = len(pesos_brutos)
            return {codigo: round(1 / n, 6) for codigo in pesos_brutos}

        return {
            codigo: round(peso / total, 6)
            for codigo, peso in pesos_brutos.items()
        }

    # ------------------------------------------------------------------ #
    # Mejora entre primer y último mes reportado                           #
    # ------------------------------------------------------------------ #

    @staticmethod
    def calcular_mejora(registros: list[dict]) -> dict | None:
        """
        Compara el resultado_obtenido del primer y último mes cronológico.
        Devuelve None si hay menos de 2 meses con datos.
        """
        puntos = sorted(
            [
                (r["mes"], r["resultado_obtenido"])
                for r in registros
                if r.get("resultado_obtenido") is not None
            ],
            key=lambda p: orden_mes(p[0]),
        )
        if len(puntos) < 2:
            return None

        primer_mes, primer_val = puntos[0]
        ultimo_mes, ultimo_val = puntos[-1]
        mejora_absoluta = round(ultimo_val - primer_val, 2)

        if primer_val != 0:
            mejora_porcentual = round((mejora_absoluta / abs(primer_val)) * 100, 1)
        else:
            mejora_porcentual = None

        return {
            "primer_mes": primer_mes,
            "ultimo_mes": ultimo_mes,
            "primer_valor": round(primer_val, 2),
            "ultimo_valor": round(ultimo_val, 2),
            "mejora_absoluta": mejora_absoluta,
            "mejora_porcentual": mejora_porcentual,
            "es_mejora": mejora_absoluta >= 0,
        }

    # ------------------------------------------------------------------ #
    # Issue #10 — Análisis Pareto                                         #
    # ------------------------------------------------------------------ #

    @staticmethod
    def calcular_pareto(todos_registros: list[dict]) -> list[dict]:
        """
        Genera el ranking Pareto. La brecha_pareto son los puntos de
        avance T1 que faltan para el 100% (100 − promedio). Se mide
        contra lo esperado a la fecha y no contra la meta de fin de
        año, para no castigar a procesos con menos meses reportados,
        y queda alineada con el semáforo del dashboard.
        """
        por_codigo: dict[str, list[dict]] = {}
        for r in todos_registros:
            por_codigo.setdefault(r["codigo_proceso"], []).append(r)

        items = []
        for codigo, registros in por_codigo.items():
            meta = registros[0]
            promedios = ProcesoService.calcular_promedios(registros)
            brecha_display = ProcesoService.calcular_brecha(registros)

            avance_promedio = promedios["promedio_avance_t1"]

            if avance_promedio is not None:
                brecha_pareto = max(100.0 - avance_promedio, 0.0)
            else:
                brecha_pareto = 0.0

            items.append({
                "codigo": codigo,
                "proceso": meta["proceso"],
                "modulo": meta["modulo"],
                "brecha": round(brecha_display, 2) if brecha_display is not None else None,
                "brecha_pareto": round(brecha_pareto, 2),
                "promedio_avance_t1": avance_promedio,
                "semaforo": calcular_semaforo(avance_promedio),
            })

        items.sort(key=lambda x: x["brecha_pareto"], reverse=True)

        total = sum(i["brecha_pareto"] for i in items)
        acumulado = 0.0
        for item in items:
            if total > 0:
                acumulado += item["brecha_pareto"]
                item["porcentaje_acumulado"] = round((acumulado / total) * 100, 2)
            else:
                item["porcentaje_acumulado"] = 100.0

        return items

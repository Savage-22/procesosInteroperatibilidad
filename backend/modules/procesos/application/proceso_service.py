from shared.meses import ordenar_por_mes
from shared.semaforo import calcular_semaforo


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
    # Issue #10 — Análisis Pareto                                         #
    # ------------------------------------------------------------------ #

    @staticmethod
    def calcular_pareto(todos_registros: list[dict]) -> list[dict]:
        """
        Genera el ranking Pareto. La brecha_pareto se ajusta por tipo
        de indicador para que siempre represente 'cuánto falta para
        cumplir la meta' sin importar si es ascendente o descendente.
        """
        por_codigo: dict[str, list[dict]] = {}
        for r in todos_registros:
            por_codigo.setdefault(r["codigo_proceso"], []).append(r)

        items = []
        for codigo, registros in por_codigo.items():
            meta = registros[0]
            promedios = ProcesoService.calcular_promedios(registros)
            brecha_display = ProcesoService.calcular_brecha(registros)
            es_descendente = registros[0].get("es_descendente", False)

            # Brecha usada para ordenar Pareto: siempre positiva si hay problema
            ultimo = ordenar_por_mes(registros)[-1]
            obtenido_ultimo = ultimo.get("resultado_obtenido")
            meta_final = ultimo.get("meta_final")

            if obtenido_ultimo is not None and meta_final is not None:
                if es_descendente:
                    # Problema cuando obtenido supera la meta
                    brecha_pareto = max(obtenido_ultimo - meta_final, 0.0)
                else:
                    # Problema cuando obtenido no llega a la meta
                    brecha_pareto = max(meta_final - obtenido_ultimo, 0.0)
            else:
                brecha_pareto = 0.0

            avance_promedio = promedios["promedio_avance_t1"]

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

from modules.procesos.application.proceso_service import ProcesoService
from modules.procesos.infrastructure.excel_reader import ExcelStore
from shared.semaforo import calcular_semaforo


class DashboardService:

    @staticmethod
    def contar_procesos_rojo() -> int:
        todos = ExcelStore.get_all()
        por_codigo: dict[str, list[dict]] = {}
        for r in todos:
            por_codigo.setdefault(r["codigo_proceso"], []).append(r)
        return sum(
            1 for regs in por_codigo.values()
            if calcular_semaforo(
                ProcesoService.calcular_promedios(regs)["promedio_avance_t1"]
            ) == "Rojo"
        )

    @staticmethod
    def obtener_resumen_institucional(por_codigo: dict[str, list[dict]]) -> dict:
        """
        Consolida el avance por módulo y calcula el puntaje institucional global.

        Por módulo:
          - avance_ponderado: promedio del avance T1 de sus procesos, ponderado
            por relevancia (Tabla A5). Si un proceso no tiene datos se excluye.
          - en_riesgo: procesos cuya predicción lineal indica que no alcanzarán
            la meta anual. Los que no tienen suficientes datos se omiten.

        Puntaje global: promedio simple de los avances ponderados por módulo,
        ya que cada módulo representa una dimensión independiente.
        """
        por_modulo: dict[str, list[str]] = {}
        for codigo, registros in por_codigo.items():
            modulo = registros[0]["modulo"]
            por_modulo.setdefault(modulo, []).append(codigo)

        resumen_modulos = []
        for modulo in sorted(por_modulo):
            codigos = por_modulo[modulo]

            # Relevancia y ponderadores dentro del módulo
            relevancia_map = {
                c: por_codigo[c][0].get("relevancia", 1) for c in codigos
            }
            ponderadores = ProcesoService.calcular_ponderadores(relevancia_map)

            avance_ponderado = None
            suma_pesos = 0.0
            suma_avance = 0.0
            en_riesgo = 0

            for codigo in codigos:
                registros = por_codigo[codigo]
                avance = ProcesoService.calcular_promedios(registros)["promedio_avance_t1"]
                peso = ponderadores.get(codigo, 0.0)

                if avance is not None:
                    suma_avance += avance * peso
                    suma_pesos += peso

                pred = ProcesoService.calcular_prediccion(registros)
                if pred is not None and pred.get("alcanzara_meta") is False:
                    en_riesgo += 1

            if suma_pesos > 0:
                avance_ponderado = round(suma_avance / suma_pesos, 1)

            resumen_modulos.append({
                "modulo": modulo,
                "avance_ponderado": avance_ponderado,
                "semaforo": calcular_semaforo(avance_ponderado),
                "total_procesos": len(codigos),
                "en_riesgo": en_riesgo,
            })

        avances_con_datos = [m["avance_ponderado"] for m in resumen_modulos if m["avance_ponderado"] is not None]
        puntaje_global = round(sum(avances_con_datos) / len(avances_con_datos), 1) if avances_con_datos else None
        total_en_riesgo = sum(m["en_riesgo"] for m in resumen_modulos)

        return {
            "puntaje_global": puntaje_global,
            "semaforo_global": calcular_semaforo(puntaje_global),
            "por_modulo": resumen_modulos,
            "total_en_riesgo": total_en_riesgo,
        }

    @staticmethod
    def obtener_kpis() -> dict:
        todos = ExcelStore.get_all()

        por_codigo: dict[str, list[dict]] = {}
        for r in todos:
            por_codigo.setdefault(r["codigo_proceso"], []).append(r)

        resumen_procesos = []
        distribucion_semaforo = []

        for codigo, registros in sorted(por_codigo.items()):
            promedios = ProcesoService.calcular_promedios(registros)
            avance = promedios["promedio_avance_t1"]
            semaforo = calcular_semaforo(avance)

            resumen_procesos.append({
                "codigo": codigo,
                "proceso": registros[0]["proceso"],
                "modulo": registros[0]["modulo"],
                "promedio_avance_t1": avance,
                "semaforo": semaforo,
            })

            # Contar meses por color usando avance_t1 recalculado
            counts: dict[str, int] = {"Verde": 0, "Amarillo": 0, "Rojo": 0}
            for r in registros:
                avance_mes = ProcesoService.calcular_avance_t1(
                    r.get("resultado_obtenido"),
                    r.get("resultado_esperado"),
                    r.get("es_descendente", False),
                )
                color = calcular_semaforo(avance_mes)
                if color in counts:
                    counts[color] += 1

            distribucion_semaforo.append({
                "codigo": codigo,
                "proceso": registros[0]["proceso"],
                "verde": counts["Verde"],
                "amarillo": counts["Amarillo"],
                "rojo": counts["Rojo"],
            })

        total = len(resumen_procesos)
        verdes = sum(1 for p in resumen_procesos if p["semaforo"] == "Verde")
        amarillos = sum(1 for p in resumen_procesos if p["semaforo"] == "Amarillo")
        rojos = sum(1 for p in resumen_procesos if p["semaforo"] == "Rojo")

        # Sin datos no hay crítico; el frontend lo trata como opcional
        critico = min(
            resumen_procesos,
            key=lambda p: p["promedio_avance_t1"] if p["promedio_avance_t1"] is not None else 100,
        ) if resumen_procesos else None

        return {
            "total_procesos": total,
            "porcentaje_verde": round(verdes / total * 100, 1) if total else 0,
            "porcentaje_amarillo": round(amarillos / total * 100, 1) if total else 0,
            "porcentaje_rojo": round(rojos / total * 100, 1) if total else 0,
            "proceso_mas_critico": critico,
            "distribucion_semaforo": distribucion_semaforo,
            "resumen_institucional": DashboardService.obtener_resumen_institucional(por_codigo),
        }

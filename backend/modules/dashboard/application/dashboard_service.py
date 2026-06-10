from modules.procesos.application.proceso_service import ProcesoService
from modules.procesos.infrastructure.excel_reader import ExcelStore
from shared.semaforo import calcular_semaforo


class DashboardService:

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
        }

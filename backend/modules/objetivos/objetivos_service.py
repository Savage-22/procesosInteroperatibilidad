from modules.procesos.application.proceso_service import ProcesoService
from modules.procesos.infrastructure.excel_reader import ExcelStore
from shared.semaforo import calcular_semaforo

_SIN_OBJETIVO = "(Sin objetivo asignado)"
_SIN_ACCION   = "(Sin acción asignada)"


def _avance_grupo(codigos: list[str], por_codigo: dict) -> float | None:
    avances = [
        ProcesoService.calcular_promedios(por_codigo[c])["promedio_avance_t1"]
        for c in codigos
        if c in por_codigo
    ]
    avances = [a for a in avances if a is not None]
    return round(sum(avances) / len(avances), 1) if avances else None


class ObjetivosService:

    @staticmethod
    def obtener_objetivos() -> dict:
        todos = ExcelStore.get_all()

        # Índice por codigo_proceso
        por_codigo: dict[str, list[dict]] = {}
        for r in todos:
            por_codigo.setdefault(r["codigo_proceso"], []).append(r)

        # Verificar si el Excel tiene las columnas estratégicas
        tiene_datos = any(
            r.get("objetivo_estrategico") or r.get("accion_estrategica")
            for r in todos
        )

        # Agrupar: objetivo → acción → lista de codigos
        estructura: dict[str, dict[str, list[str]]] = {}
        meta_proceso: dict[str, dict] = {}  # codigo → primer registro del proceso

        for codigo, registros in por_codigo.items():
            r0 = registros[0]
            obj = r0.get("objetivo_estrategico") or _SIN_OBJETIVO
            acc = r0.get("accion_estrategica")  or _SIN_ACCION
            meta_proceso[codigo] = r0
            estructura.setdefault(obj, {}).setdefault(acc, []).append(codigo)

        objetivos = []
        for obj_nombre, acciones_map in sorted(estructura.items()):
            acciones = []
            for acc_nombre, codigos in sorted(acciones_map.items()):
                procesos = []
                for codigo in sorted(codigos):
                    avance = ProcesoService.calcular_promedios(por_codigo[codigo])["promedio_avance_t1"]
                    r0 = meta_proceso[codigo]
                    procesos.append({
                        "codigo": codigo,
                        "proceso": r0["proceso"],
                        "modulo": r0["modulo"],
                        "avance": avance,
                        "semaforo": calcular_semaforo(avance),
                    })

                avance_acc = _avance_grupo(codigos, por_codigo)
                acciones.append({
                    "accion": acc_nombre,
                    "avance": avance_acc,
                    "semaforo": calcular_semaforo(avance_acc),
                    "procesos": procesos,
                })

            todos_codigos = [c for acc in acciones_map.values() for c in acc]
            avance_obj = _avance_grupo(todos_codigos, por_codigo)
            objetivos.append({
                "objetivo": obj_nombre,
                "avance": avance_obj,
                "semaforo": calcular_semaforo(avance_obj),
                "acciones": acciones,
            })

        return {
            "tiene_datos": tiene_datos,
            "objetivos": objetivos,
        }

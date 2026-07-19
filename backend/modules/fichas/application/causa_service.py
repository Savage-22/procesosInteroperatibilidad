from sqlmodel import Session, select

from modules.fichas.application.errores import ErrorNoEncontrado, ErrorValidacion
from modules.fichas.application.proceso_lookup import resolver_proceso
from modules.fichas.infrastructure.models import Causa

CATEGORIAS_6M = ["Método", "Personas", "Entorno", "Medición", "Máquina-TI", "Materiales"]

UMBRAL_PARETO = 80.0


class CausaService:
    """Diagnóstico de causas raíz (Ishikawa 6M) y Pareto de causas (Mejora I)."""

    @staticmethod
    def listar(session: Session, codigo: str) -> dict:
        proceso = resolver_proceso(session, codigo)
        causas = session.exec(
            select(Causa).where(
                Causa.proceso_id == proceso.id,
                Causa.activo == True,  # noqa: E712
            )
        ).all()

        # Agrupa por categoría 6M para el diagrama de Ishikawa
        por_categoria = {cat: [] for cat in CATEGORIAS_6M}
        for c in causas:
            por_categoria.setdefault(c.categoria, []).append(CausaService._serializar(c))

        return {
            "codigo": proceso.codigo,
            "proceso": proceso.nombre,
            "categorias": CATEGORIAS_6M,
            "ishikawa": por_categoria,
            "pareto": CausaService._pareto(causas),
        }

    @staticmethod
    def crear(session: Session, codigo: str, datos: dict) -> dict:
        proceso = resolver_proceso(session, codigo)
        categoria = (datos.get("categoria") or "").strip()
        descripcion = (datos.get("descripcion") or "").strip()
        if categoria not in CATEGORIAS_6M:
            raise ErrorValidacion(f"Categoría inválida. Usa una de: {', '.join(CATEGORIAS_6M)}")
        if not descripcion:
            raise ErrorValidacion("La descripción de la causa es obligatoria")

        causa = Causa(
            proceso_id=proceso.id,
            categoria=categoria,
            descripcion=descripcion,
            es_raiz=bool(datos.get("es_raiz", False)),
            peso=float(datos.get("peso") or 1.0),
        )
        session.add(causa)
        session.commit()
        session.refresh(causa)
        return CausaService._serializar(causa)

    @staticmethod
    def actualizar(session: Session, causa_id: int, datos: dict) -> dict:
        causa = CausaService._resolver(session, causa_id)
        if "categoria" in datos:
            categoria = (datos.get("categoria") or "").strip()
            if categoria not in CATEGORIAS_6M:
                raise ErrorValidacion("Categoría inválida")
            causa.categoria = categoria
        if "descripcion" in datos:
            descripcion = (datos.get("descripcion") or "").strip()
            if not descripcion:
                raise ErrorValidacion("La descripción de la causa es obligatoria")
            causa.descripcion = descripcion
        if "es_raiz" in datos:
            causa.es_raiz = bool(datos["es_raiz"])
        if "peso" in datos:
            causa.peso = float(datos["peso"] or 1.0)
        session.add(causa)
        session.commit()
        session.refresh(causa)
        return CausaService._serializar(causa)

    @staticmethod
    def eliminar(session: Session, causa_id: int) -> None:
        causa = CausaService._resolver(session, causa_id)
        causa.activo = False
        session.add(causa)
        session.commit()

    # ------------------------------------------------------------------ #
    # Pareto de causas                                                   #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _pareto(causas: list[Causa]) -> dict:
        """Ordena por peso descendente y marca el corte donde se acumula el 80%."""
        ordenadas = sorted(causas, key=lambda c: c.peso, reverse=True)
        total = sum(c.peso for c in ordenadas)

        items = []
        acumulado = 0.0
        for c in ordenadas:
            acumulado += c.peso
            items.append({
                "id": c.id,
                "descripcion": c.descripcion,
                "categoria": c.categoria,
                "es_raiz": c.es_raiz,
                "peso": round(c.peso, 2),
                "porcentaje": round((c.peso / total) * 100, 2) if total else 0.0,
                "porcentaje_acumulado": round((acumulado / total) * 100, 2) if total else 0.0,
            })

        umbral_80 = next(
            (i for i, it in enumerate(items) if it["porcentaje_acumulado"] >= UMBRAL_PARETO),
            len(items) - 1 if items else 0,
        )
        return {"items": items, "umbral_80": umbral_80, "total": round(total, 2)}

    # ------------------------------------------------------------------ #
    # Helpers                                                            #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _resolver(session: Session, causa_id: int) -> Causa:
        causa = session.get(Causa, causa_id)
        if causa is None or not causa.activo:
            raise ErrorNoEncontrado("La causa no existe")
        return causa

    @staticmethod
    def _serializar(causa: Causa) -> dict:
        return {
            "id": causa.id,
            "categoria": causa.categoria,
            "descripcion": causa.descripcion,
            "es_raiz": causa.es_raiz,
            "peso": causa.peso,
        }

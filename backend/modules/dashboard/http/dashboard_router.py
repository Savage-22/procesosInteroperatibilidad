from fastapi import APIRouter

from modules.dashboard.application.dashboard_service import DashboardService

router = APIRouter(prefix="/api")


# ------------------------------------------------------------------ #
# Issue #13 — GET /api/dashboard                                      #
# ------------------------------------------------------------------ #

@router.get("/dashboard")
def dashboard():
    return {"success": True, "data": DashboardService.obtener_kpis()}

@echo off
REM Levanta backend y frontend en modo desarrollo (Windows)
cd /d %~dp0

if not exist backend\.venv (
    echo Creando entorno virtual del backend...
    python -m venv backend\.venv
)
call backend\.venv\Scripts\pip install -q -r backend\requirements.txt

if not exist frontend\node_modules (
    echo Instalando dependencias del frontend...
    pushd frontend
    call npm install
    popd
)

start "Backend FastAPI" cmd /k "cd /d %~dp0backend && .venv\Scripts\uvicorn main:app --reload --port 8000"
start "Frontend Vite" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo Cierra las dos ventanas para detener los servidores

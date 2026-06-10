#!/usr/bin/env bash
# Levanta backend y frontend en modo desarrollo (Linux/macOS)
set -e
cd "$(dirname "$0")"

if [ ! -d backend/.venv ]; then
    echo "Creando entorno virtual del backend…"
    python3 -m venv backend/.venv
fi
backend/.venv/bin/pip install -q -r backend/requirements.txt

if [ ! -d frontend/node_modules ]; then
    echo "Instalando dependencias del frontend…"
    (cd frontend && npm install)
fi

(cd backend && .venv/bin/uvicorn main:app --reload --port 8000) &
BACKEND_PID=$!

(cd frontend && npm run dev) &
FRONTEND_PID=$!

trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null' INT TERM EXIT

echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Ctrl+C para detener ambos"
wait

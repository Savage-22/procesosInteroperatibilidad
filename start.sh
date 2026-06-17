#!/usr/bin/env bash
# Levanta backend y frontend en modo desarrollo (Linux / macOS)

set -euo pipefail
cd "$(dirname "$0")"

# ---- Colores ----
OK="\033[0;32m[OK]\033[0m"
ERR="\033[0;31m[ERROR]\033[0m"

echo "=============================================="
echo " Dashboard CEPLAN - Iniciando..."
echo "=============================================="
echo ""

# ---- Detectar Python 3 ----
PYTHON=""
for cmd in python3 python; do
    if command -v "$cmd" &>/dev/null; then
        VER=$("$cmd" --version 2>&1 | grep -oP '\d+\.\d+' | head -1)
        MAJ=$(echo "$VER" | cut -d. -f1)
        MIN=$(echo "$VER" | cut -d. -f2)
        if [ "${MAJ:-0}" -ge 3 ] && [ "${MIN:-0}" -ge 11 ]; then
            PYTHON="$cmd"
            echo -e "$OK Python $VER encontrado ($cmd)"
            break
        fi
    fi
done
if [ -z "$PYTHON" ]; then
    echo -e "$ERR Python 3.11 o superior no encontrado."
    echo "  Instala Python 3.12 desde https://www.python.org/downloads/"
    echo "  o con tu gestor de paquetes: sudo apt install python3.12"
    exit 1
fi

# ---- Detectar Node.js ----
if ! command -v node &>/dev/null; then
    echo -e "$ERR Node.js no encontrado."
    echo "  Instala Node.js 20+ desde https://nodejs.org/"
    echo "  o con: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install nodejs"
    exit 1
fi
echo -e "$OK Node.js $(node --version) encontrado"
echo ""

# ---- Entorno virtual Python ----
if [ ! -d backend/.venv ]; then
    echo "Creando entorno virtual de Python..."
    "$PYTHON" -m venv backend/.venv
    echo -e "$OK Entorno virtual creado"
fi

# ---- Dependencias del backend ----
echo "Instalando dependencias del backend..."
backend/.venv/bin/pip install -q -r backend/requirements.txt
echo -e "$OK Dependencias del backend instaladas"

# ---- Dependencias del frontend ----
if [ ! -d frontend/node_modules ]; then
    echo "Instalando dependencias del frontend (puede tardar 1-2 minutos)..."
    (cd frontend && npm install)
    echo -e "$OK Dependencias del frontend instaladas"
fi

echo ""
echo "Arrancando servidores..."

# Arrancar backend en background
(cd backend && .venv/bin/uvicorn main:app --reload --port 8000) &
BACKEND_PID=$!

# Arrancar frontend en background
(cd frontend && npm run dev) &
FRONTEND_PID=$!

trap 'echo ""; echo "Deteniendo servidores..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT TERM

echo ""
echo "=============================================="
echo " Backend:  http://localhost:8000"
echo " Frontend: http://localhost:5173"
echo ""
echo " Presiona Ctrl+C para detener ambos servidores"
echo "=============================================="
echo ""

wait

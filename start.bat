@echo off
setlocal EnableDelayedExpansion

echo ==============================================
echo  Dashboard CEPLAN - Iniciando...
echo ==============================================
echo.

cd /d "%~dp0"

rem ---- Detectar Python (python / py / python3) ----
set "PYTHON="
where python >nul 2>&1 && set "PYTHON=python"
if not defined PYTHON (
    where py >nul 2>&1 && set "PYTHON=py"
)
if not defined PYTHON (
    where python3 >nul 2>&1 && set "PYTHON=python3"
)
if not defined PYTHON (
    echo [ERROR] Python no encontrado.
    echo Instala Python 3.12 o superior desde https://www.python.org/downloads/
    echo Durante la instalacion marca la opcion "Add Python to PATH".
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('!PYTHON! --version 2^>^&1') do echo [OK] %%v encontrado

rem ---- Detectar Node.js ----
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no encontrado.
    echo Instala Node.js 20 o superior desde https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version 2^>^&1') do echo [OK] Node.js %%v encontrado
echo.

rem ---- Entorno virtual Python ----
if not exist "backend\.venv" (
    echo Creando entorno virtual de Python...
    !PYTHON! -m venv "backend\.venv"
    if errorlevel 1 (
        echo [ERROR] No se pudo crear el entorno virtual.
        echo Asegurate de tener Python 3.12+ y permisos de escritura en esta carpeta.
        pause
        exit /b 1
    )
    echo [OK] Entorno virtual creado
)

rem ---- Dependencias del backend ----
echo Instalando dependencias del backend...
"backend\.venv\Scripts\pip" install -q -r "backend\requirements.txt"
if errorlevel 1 (
    echo [ERROR] Fallo la instalacion de paquetes Python.
    echo Intenta borrar la carpeta backend\.venv y volver a ejecutar este archivo.
    pause
    exit /b 1
)
echo [OK] Dependencias del backend instaladas

rem ---- Dependencias del frontend ----
if not exist "frontend\node_modules" (
    echo Instalando dependencias del frontend ^(puede tardar 1-2 minutos^)...
    pushd frontend
    call npm install
    popd
    if errorlevel 1 (
        echo [ERROR] Fallo npm install.
        echo Intenta borrar la carpeta frontend\node_modules y volver a ejecutar.
        pause
        exit /b 1
    )
)
echo [OK] Dependencias del frontend instaladas
echo.
echo Arrancando servidores...

rem  /d establece el directorio de trabajo SIN usar cd dentro del string,
rem  lo que evita el fallo cuando el path tiene espacios.
start "Backend - Dashboard CEPLAN" /d "%~dp0backend" cmd /k ".venv\Scripts\uvicorn main:app --reload --port 8000"
timeout /t 2 /nobreak >nul
start "Frontend - Dashboard CEPLAN" /d "%~dp0frontend" cmd /k "npm run dev"

echo.
echo ==============================================
echo  Abriendo el navegador en 5 segundos...
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:5173
echo.
echo  Si el navegador no abre, entra tu mismo a:
echo  http://localhost:5173
echo ==============================================
timeout /t 5 /nobreak >nul
start http://localhost:5173

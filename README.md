# Dashboard CEPLAN — Ingeniería de Procesos (Interoperabilidad)

Aplicación web para el seguimiento y evaluación de procesos según la **Directiva CEPLAN N° 0056-2024**. Lee los datos mensuales de los módulos M1, M2, M3 y M4 desde un archivo Excel y los presenta en un dashboard con semáforos, comparativas y análisis de Pareto.

## Inicio rápido (primera vez)

**Requisitos previos** (instálalos si no los tienes):

| Herramienta | Versión mínima | Descarga |
|---|---|---|
| Python | 3.11 + | https://www.python.org/downloads/ — marcar **"Add Python to PATH"** |
| Node.js | 20 + | https://nodejs.org/ |
| Git | cualquiera | https://git-scm.com/ |

```bash
# 1. Clonar el repositorio
git clone <URL-del-repo>
cd proyecto

# 2. Ejecutar el script de arranque
./start.sh        # Linux / macOS
start.bat         # Windows  (doble clic o desde cmd)
```

El script instala todo automáticamente y abre el navegador en **http://localhost:5173**.
No hace falta tocar ningún otro archivo.

## Funcionalidades

- **Dashboard** (`/`) — KPIs globales, distribución de semáforo por proceso y tabla resumen ordenable
- **Detalle de proceso** (`/proceso/:codigo`) — resultado obtenido vs esperado, avance T1 mensual con umbrales 95/75 y tabla de datos
- **Comparativa** (`/comparativa`) — líneas superpuestas de avance T1 con selector múltiple por módulo y leyenda interactiva
- **Pareto** (`/pareto`) — ranking de criticidad por *brecha de avance* (100 − avance T1 promedio): identifica los procesos que concentran el 80% del incumplimiento respecto a lo esperado **a la fecha**, alineado con el semáforo
- **Predicciones** (`/predicciones`) — proyección del resultado de cada proceso hasta diciembre mediante regresión lineal sobre los meses reportados: tendencia, valor estimado a fin de año, mes en que cruza la meta y nivel de confiabilidad (R²)
- **Recarga en caliente** — al editar y guardar el Excel, el backend recarga los datos y el frontend se refresca solo (sin reiniciar nada)
- **Carga desde la interfaz** — botón "Cargar Excel" en el navbar que sube un nuevo archivo de datos (`POST /api/upload`) y refresca todas las vistas al instante

### Semáforo CEPLAN

| Color | Avance T1 |
|---|---|
| 🟢 Verde | 95–100 % |
| 🟡 Amarillo | 75–95 % |
| 🔴 Rojo | 0–75 % |

## Arquitectura

```
proyecto/
├── datos_estandarizados.xlsx   # Fuente de datos (una hoja por módulo)
├── docker-compose.yml
├── start.sh / start.bat        # Arranque en modo desarrollo (Linux / Windows)
├── backend/                    # FastAPI + pandas
│   ├── main.py                 # App, CORS, lifespan y vigilante del Excel
│   ├── shared/                 # Utilidades (orden de meses, semáforo)
│   ├── modules/
│   │   ├── procesos/           # Lector de Excel, cálculos, endpoints
│   │   └── dashboard/          # KPIs globales
│   └── tests/                  # pytest
└── frontend/                   # React 19 + Vite + Tailwind (screaming architecture)
    └── src/
        ├── domains/            # dashboard, procesos, comparativa, pareto
        │   └── <dominio>/      # pages/ components/ services/ api/
        ├── shared/             # contexto de datos, hooks, componentes comunes
        └── infrastructure/     # httpClient (axios)
```

## Ejecución con Docker (recomendado)

Requiere Docker Desktop (Windows) o Docker Engine + Compose (Linux).

```bash
docker compose up --build
```

- Frontend: **http://localhost:8080**
- El Excel se monta como volumen: editarlo en el host actualiza la app en ~15 s sin reconstruir nada.

> En Linux, si tu usuario no está en el grupo `docker`, usa `sudo docker compose up --build` o agrégate al grupo: `sudo usermod -aG docker $USER` (requiere cerrar sesión).

## Ejecución en modo desarrollo (sin Docker)

Requisitos: Python 3.12+, Node.js 20+.

**Linux / macOS:**

```bash
./start.sh
```

**Windows:**

```bat
start.bat
```

Los scripts crean el venv, instalan dependencias y levantan ambos servidores:

- Backend: http://localhost:8000 (docs interactivas en `/docs`)
- Frontend: http://localhost:5173

<details>
<summary>Pasos manuales equivalentes</summary>

```bash
# Backend
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt        # Windows: .venv\Scripts\pip
.venv/bin/uvicorn main:app --reload --port 8000

# Frontend (otra terminal)
cd frontend
npm install
npm run dev
```
</details>

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `EXCEL_PATH` (backend) | `../datos_estandarizados.xlsx` | Ruta del Excel de datos |
| `ALLOWED_ORIGINS` (backend) | `http://localhost:5173` | Orígenes CORS, separados por coma |
| `EXCEL_WATCH_INTERVAL` (backend) | `5` | Segundos entre chequeos de cambios del Excel |
| `MODULOS_ESPERADOS` (backend) | `M1,M2,M3,M4` | Módulos cuya ausencia genera advertencia en la interfaz |
| `VITE_API_URL` (frontend) | `http://localhost:8000` | URL del backend (vacío = mismo origen, usado en Docker) |

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/procesos` | Lista de procesos con promedios, brecha y semáforo |
| GET | `/api/procesos/{codigo}` | Detalle mensual de un proceso (ej. `M1.1`) |
| GET | `/api/dashboard` | KPIs globales y distribución de semáforo |
| GET | `/api/comparativa?codigos=M1.1,M2.2` | Avance T1 por proceso y mes (filtro opcional) |
| GET | `/api/pareto` | Ranking Pareto con % acumulado y umbral 80 |
| GET | `/api/predicciones` | Proyección de tendencia a diciembre por proceso (regresión lineal) |
| GET | `/api/meta` | Versión de datos, última carga, módulos y advertencias |
| POST | `/api/upload` | Sube un nuevo Excel de datos (multipart, campo `archivo`) |
| GET | `/health` | Estado del servidor |

Formato de respuesta: `{ "success": true, "data": … }`.

## Formato del Excel

Un archivo `datos_estandarizados.xlsx` con **una hoja por equipo/módulo** (el nombre de la hoja es libre, ej. `P1 - Canteño`). En cada hoja:

- La fila de encabezados se detecta automáticamente en las primeras filas; las columnas se reconocen por nombre y toleran variantes (`Sentido Indicador` / `Tipo Indicador`, `META FINAL` / `META FINAL (%)`)
- Columnas: código de proceso (`M1.1`…), proceso, indicador, sentido (Ascendente/Descendente), unidad, meta final, año, mes, numerador, denominador y resultado esperado
- El **módulo se deriva del código** (`M4.1` → módulo M4); no hace falta declararlo en la hoja
- El backend usa **solo los datos crudos** y calcula el resto en Python para evitar errores de fórmulas:
  - resultado obtenido = numerador ÷ denominador (×100 si la unidad es `%`; promedio si es `días` u otra unidad)
  - diferencia, avance T1 y semáforo CEPLAN
  - las columnas ya calculadas del Excel (obtenido, diferencia, avance, semáforo) se ignoran — la de obtenido solo sirve de respaldo cuando una fila no tiene numerador/denominador
- Las filas que no son datos (notas, tablas auxiliares de fórmulas) se descartan automáticamente

Si falta una hoja o el archivo, el servidor arranca igual con los datos disponibles y la interfaz muestra una advertencia no bloqueante.

## Tests

```bash
cd backend
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m pytest        # Windows: .venv\Scripts\python -m pytest
```

## Solución de problemas frecuentes

### "python no se reconoce como un comando" (Windows)

Python no está en el PATH. Dos opciones:

1. Reinstala Python desde https://www.python.org/downloads/ y marca **"Add Python to PATH"** durante la instalación.
2. Busca en el menú inicio **"Editar las variables de entorno del sistema"** → Variables de entorno → PATH → agrega la carpeta donde instalaste Python (ej. `C:\Python312` y `C:\Python312\Scripts`).

### El navegador abre pero sale "No se puede conectar" o pantalla en blanco

El backend no arrancó correctamente. Abre la ventana llamada **"Backend - Dashboard CEPLAN"** y lee el error. Los más comunes:

- `Address already in use` → el puerto 8000 ya está ocupado. Cierra el proceso que lo usa o cambia el puerto en el script.
- `ModuleNotFoundError` → borra la carpeta `backend/.venv` y vuelve a ejecutar `start.bat` / `start.sh`.

### "npm no se reconoce" (Windows)

Node.js no está en el PATH. Reinstala Node.js desde https://nodejs.org/ y reinicia la terminal.

### `start.sh: Permission denied` (Linux / macOS)

```bash
chmod +x start.sh
./start.sh
```

### El frontend arranca pero los datos no cargan (error CORS o "Network Error")

Verifica que el backend esté corriendo en http://localhost:8000. Abre esa URL en el navegador: si ves `{"status":"ok",...}` el backend está bien. Si no carga, revisa la ventana del backend.

### Quiero reiniciar desde cero

```bash
# Borra las dependencias instaladas y vuelve a ejecutar el script
rm -rf backend/.venv frontend/node_modules   # Linux/macOS
# Windows: borra manualmente backend\.venv y frontend\node_modules
```

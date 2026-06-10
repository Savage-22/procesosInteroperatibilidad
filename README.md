# Dashboard CEPLAN — Ingeniería de Procesos (Interoperabilidad)

Aplicación web para el seguimiento y evaluación de procesos según la **Directiva CEPLAN N° 0056-2024**. Lee los datos mensuales de los módulos M1, M2, M3 y M4 desde un archivo Excel y los presenta en un dashboard con semáforos, comparativas y análisis de Pareto.

## Funcionalidades

- **Dashboard** (`/`) — KPIs globales, distribución de semáforo por proceso y tabla resumen ordenable
- **Detalle de proceso** (`/proceso/:codigo`) — resultado obtenido vs esperado, avance T1 mensual con umbrales 95/75 y tabla de datos
- **Comparativa** (`/comparativa`) — líneas superpuestas de avance T1 con selector múltiple por módulo y leyenda interactiva
- **Pareto** (`/pareto`) — ranking de criticidad: el 20% de procesos que concentra el 80% de la brecha
- **Recarga en caliente** — al editar y guardar el Excel, el backend recarga los datos y el frontend se refresca solo (sin reiniciar nada)

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
| `VITE_API_URL` (frontend) | `http://localhost:8000` | URL del backend (vacío = mismo origen, usado en Docker) |

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/procesos` | Lista de procesos con promedios, brecha y semáforo |
| GET | `/api/procesos/{codigo}` | Detalle mensual de un proceso (ej. `M1.1`) |
| GET | `/api/dashboard` | KPIs globales y distribución de semáforo |
| GET | `/api/comparativa?codigos=M1.1,M2.2` | Avance T1 por proceso y mes (filtro opcional) |
| GET | `/api/pareto` | Ranking Pareto con % acumulado y umbral 80 |
| GET | `/api/meta` | Versión de datos, última carga, módulos y advertencias |
| GET | `/health` | Estado del servidor |

Formato de respuesta: `{ "success": true, "data": … }`.

## Formato del Excel

Un archivo `datos_estandarizados.xlsx` con **una hoja por módulo** (M1, M2, M3). En cada hoja:

- La celda `A1` identifica el módulo (debe contener `M1`, `M2` o `M3`)
- Los datos comienzan en la fila 4, con columnas: código (`M1.1`…), proceso, indicador, meta (texto), meta final, año, mes, numerador, denominador, resultado esperado, resultado obtenido, diferencia, avance T1, semáforo
- Una meta con `≤` se interpreta como indicador descendente (menor es mejor)

Si falta una hoja o el archivo, el servidor arranca igual con los datos disponibles y la interfaz muestra una advertencia no bloqueante.

## Tests

```bash
cd backend
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m pytest        # Windows: .venv\Scripts\python -m pytest
```

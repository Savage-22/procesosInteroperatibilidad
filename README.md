# Dashboard CEPLAN — Ingeniería de Procesos (Interoperabilidad)

Aplicación web para el seguimiento y evaluación de procesos según la **Directiva CEPLAN N° 0056-2024**. Lee los datos mensuales de los módulos M1, M2, M3 y M4 desde un archivo Excel y los presenta en un dashboard con semáforos, comparativas y análisis de Pareto.

## Inicio rápido (Docker — recomendado)

Requiere [Docker](https://docs.docker.com/engine/install/) instalado.

```bash
git clone <URL-del-repo>
cd proyecto
docker compose up --build
```

Abre **http://localhost:8080** en el navegador.
El primer arranque construye las imágenes (~2 min). Los siguientes arranques son instantáneos.

> **Windows**: usa Docker Desktop. Si tu usuario no tiene permisos en Linux, agrégate al grupo docker: `sudo usermod -aG docker $USER` (requiere cerrar sesión).

## Desarrollo local (sin Docker)

Requiere Python 3.11 + y Node.js 20 +.

```bash
./start.sh        # Linux / macOS
```

El script crea el venv, instala dependencias y levanta ambos servidores:
- Backend: http://localhost:8000
- Frontend: http://localhost:5173

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

## Despliegue en producción (GCP / VPS)

Requiere Docker Engine + Docker Compose en el servidor, y Nginx en el host para SSL.

### 1 — Clonar y configurar

```bash
git clone <URL-del-repo>
cd proyecto
cp .env.example .env
# Editar .env y cambiar ALLOWED_ORIGINS a tu dominio:
# ALLOWED_ORIGINS=https://interoperatibilidad.devteamaadj.xyz
```

### 2 — Configurar Nginx en el host (SSL)

```bash
# Copiar la plantilla de configuración al servidor
sudo cp nginx/interoperatibilidad.devteamaadj.xyz.conf \
        /etc/nginx/sites-available/interoperatibilidad.devteamaadj.xyz
sudo ln -s /etc/nginx/sites-available/interoperatibilidad.devteamaadj.xyz \
           /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Obtener certificado SSL con certbot (solo la primera vez)
sudo certbot --nginx -d interoperatibilidad.devteamaadj.xyz
```

### 3 — Levantar los contenedores

```bash
docker compose up --build -d
```

El frontend queda en el puerto `8080` del servidor; Nginx lo expone por HTTPS al exterior.

### 4 — Cargar el Excel inicial

En la primera ejecución el volumen está vacío. Hay dos formas de cargar los datos:

**Opción A (recomendada)** — desde la interfaz web: abre el dashboard, haz clic en el ícono de subir Excel en el navbar y sube el archivo.

**Opción B** — copiar directamente al volumen:
```bash
docker compose cp datos_estandarizados.xlsx backend:/data/datos_estandarizados.xlsx
```

### Actualizar la aplicación

```bash
git pull
docker compose up --build -d
# El Excel en el volumen se conserva; no es necesario volver a subirlo.
# Las imágenes antiguas quedan en caché; límpialas si el espacio es ajustado:
docker image prune -f
```

### Apagar / reiniciar

```bash
docker compose down       # detiene sin borrar el volumen (datos conservados)
docker compose down -v    # borra también el volumen (⚠ elimina el Excel guardado)
```

### Liberar espacio en disco

```bash
# Ver cuánto ocupa Docker en total
docker system df

# Borrar imágenes sin usar, contenedores parados y caché de capas
# (los volúmenes con datos se conservan)
docker system prune -f

# Borrar TODO incluyendo volúmenes (⚠ borra el Excel guardado)
docker system prune --volumes -f
```

> **Nota sobre almacenamiento**: el Excel subido siempre sobrescribe el archivo anterior; no se acumula. El único espacio variable son los logs de los contenedores, limitados a **~12 MB total** por la configuración de este compose.

---

## Ejecución en modo desarrollo (sin Docker)

Requisitos: Python 3.12+, Node.js 20+.

**Linux / macOS:**

```bash
./start.sh
```

Levanta backend en http://localhost:8000 y frontend en http://localhost:5173.

<details>
<summary>Pasos manuales equivalentes</summary>

```bash
# Backend
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
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

### El navegador abre pero sale "No se puede conectar" o pantalla en blanco (Docker)

El backend no arrancó correctamente. Revisa los logs:

```bash
docker compose logs backend
```

Los errores más comunes:

- `Address already in use` → el puerto 8080 ya está ocupado. Cambia el mapeo en `docker-compose.yml` a `"8081:80"`.
- El healthcheck falla → espera 30 s y vuelve a intentar; si persiste, revisa los logs del backend.

### `start.sh: Permission denied` (Linux / macOS)

```bash
chmod +x start.sh && ./start.sh
```

### El frontend arranca pero los datos no cargan (error CORS o "Network Error")

En Docker, verifica que `ALLOWED_ORIGINS` en `.env` incluya el origen desde el que abres el navegador. Para desarrollo local debe ser `http://localhost:8080`.

### Reiniciar desde cero (dev sin Docker)

```bash
rm -rf backend/.venv frontend/node_modules
./start.sh
```

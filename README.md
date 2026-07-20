# SIIP — Sistema Inteligente de Interoperabilidad de Procesos

Plataforma web con **Asistente IA integrado** para el seguimiento, evaluación y orientación en el cumplimiento de la **Directiva CEPLAN N° 0056-2024** sobre interoperabilidad de servicios públicos. Lee los datos mensuales de los módulos M1, M2, M3 y M4 desde un archivo Excel y los presenta con semáforos, comparativas, análisis de Pareto y recomendaciones generadas por inteligencia artificial.

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
- **Tablero de control** (`/tablero`) — monitoreo indicador por indicador: valor actual vs. meta, avance, semáforo, tendencia, cumplimiento del compromiso mensual y alerta de indicadores en rojo sin plan de mejora. Filtrable por semáforo y por semestre
- **Resultados del análisis** (`/resultados`) — resultado de cada indicador y efecto de las mejoras aplicadas: comparación antes/después, causas raíz, oportunidades implementadas y avance de la gestión del cambio, más el **informe ejecutivo** y un **informe por macroproceso** (M1, M2, M3, M4) generados por IA
- **Anexos** (`/anexos`) — vista previa imprimible de los Anexos 1 (inventario), 2 (ficha SIPOC) y 4 (ficha de indicadores) con el formato de la directiva. El botón "Descargar PDF" usa la impresión del navegador
- **Bitácora** (`/bitacora`) — registro de las 9 fases metodológicas del trabajo; el estado de cada fase se deriva de la evidencia realmente cargada en el sistema, así que nunca queda desincronizada
- **Asistente guiado** (`/onboarding`) — 6 pasos para dejar el tablero operativo desde cero, con sugerencias de la IA para el SIPOC y los indicadores
- **Detalle de proceso** (`/proceso/:codigo`) — resultado obtenido vs esperado, avance T1 mensual con umbrales 95/75 y tabla de datos
- **Comparativa** (`/comparativa`) — líneas superpuestas de avance T1 con selector múltiple por módulo y leyenda interactiva, más un **informe comparativo** por IA que explica quién lidera, quién se rezaga y qué conviene replicar
- **Pareto** (`/pareto`) — ranking de criticidad por *brecha de avance* (100 − avance T1 promedio): identifica los procesos que concentran el 80% del incumplimiento respecto a lo esperado **a la fecha**, alineado con el semáforo
- **Predicciones** (`/predicciones`) — proyección del resultado de cada proceso hasta diciembre mediante regresión lineal sobre los meses reportados: tendencia, valor estimado a fin de año, mes en que cruza la meta y nivel de confiabilidad (R²)
- **Metodología** (`/metodologia`) — cómo se obtiene cada resultado (semáforo, avance T1, ponderadores, mejora y predicción) con las fórmulas de la directiva aplicadas a los datos reales, y el **apartado de investigaciones**: las tesis, artículos y normas que sustentan cada macroproceso (M1–M4), con enlace al repositorio y el aporte concreto de cada una
- **Análisis con IA** — botón *Analizar* en el tablero, resultados, Pareto, predicciones y en el módulo de mejora: la IA lee los datos reales de esa sección y devuelve diagnóstico, hallazgos priorizados por severidad y recomendaciones accionables. También propone causas Ishikawa, indicadores y contenido SIPOC; nada se guarda sin que el usuario lo confirme
- **Informes que no se pierden** — cada informe y cada análisis de IA se archiva en la base al generarlo y se recupera al volver a la vista: cambiar de pantalla o recargar ya no obliga a pagar otra llamada al proveedor. El botón *Regenerar* lo reemplaza y *Descartar* lo borra
- **Recarga en caliente** — al editar y guardar el Excel, el backend recarga los datos y el frontend se refresca solo (sin reiniciar nada)
- **Carga desde la interfaz** — botón "Cargar Excel" en el navbar que sube un nuevo archivo de datos (`POST /api/upload`) y refresca todas las vistas al instante
- **Excel de ida y vuelta** — "Exportar Excel" descarga todo el estado del sistema (mediciones, inventario, fichas SIPOC, indicadores, investigaciones, Ishikawa, oportunidades, proyección y plan de Lewin) y ese mismo libro se puede volver a subir sin perder nada. La plantilla descargable trae esas mismas hojas documentadas y con ejemplos, para que una entidad nueva llegue con todo cargado

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
├── backend/                    # FastAPI + pandas + SQLModel
│   ├── main.py                 # App, CORS, lifespan y vigilante del Excel
│   ├── shared/                 # Utilidades (meses, semáforo, periodo, cliente de IA)
│   ├── modules/
│   │   ├── procesos/           # Lector de Excel, cálculos, endpoints
│   │   ├── dashboard/          # KPIs globales
│   │   ├── fichas/             # Inventario, fichas SIPOC, indicadores y mejora
│   │   ├── anexos/             # Anexos 1, 2 y 4 listos para renderizar
│   │   ├── tablero/            # Monitoreo por indicador y resultados consolidados
│   │   ├── bitacora/           # Fases del trabajo con su evidencia
│   │   ├── analisis/           # Análisis y sugerencias con IA
│   │   └── chat/               # Asistente conversacional
│   └── tests/                  # pytest
└── frontend/                   # React 19 + Vite + Tailwind (screaming architecture)
    └── src/
        ├── domains/            # dashboard, tablero, resultados, anexos, bitacora,
        │   │                   # procesos, comparativa, pareto, predicciones,
        │   │                   # inventario, fichas, mejora, objetivos, onboarding
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
| `DEEPSEEK_API_KEY` (backend) | — | Clave del proveedor de IA. Sin ella el chat y los paneles de análisis se ocultan; el resto del sistema funciona igual |
| `PERIODO_EVALUACION` (backend) | `S1` | Semestre por defecto de la evaluación (`S1` = Ene–Jun, `S2` = Jul–Dic) |
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
| GET | `/api/tablero?periodo=S1` | Monitoreo por indicador: estado vs. meta, tendencia y alertas |
| GET | `/api/resultados` | Resultados de los indicadores y efecto de las mejoras aplicadas |
| GET | `/api/bitacora` | Fases del trabajo con la evidencia registrada en el sistema |
| GET | `/api/anexos` | Anexos emitibles y su grado de completitud |
| GET | `/api/anexos/1` | Anexo 1 — Inventario de productos y procesos |
| GET | `/api/anexos/2/{codigo}` | Anexo 2 — Ficha de producto y proceso (SIPOC) |
| GET | `/api/anexos/4/{codigo}` | Anexo 4 — Ficha de indicadores |
| GET | `/api/analisis/estado` | Si la IA está configurada en este servidor |
| POST | `/api/analisis/seccion/{seccion}` | Análisis de una sección (`tablero`, `resultados`, `pareto`, `predicciones`, `mejora`) |
| GET | `/api/analisis/informe` | Informe ejecutivo global del estado institucional |
| GET | `/api/analisis/informe/modulo/{modulo}` | Informe de gestión de un macroproceso (`M1`…`M4`) |
| POST | `/api/analisis/informe/comparativa` | Informe comparativo de los procesos seleccionados |
| GET | `/api/analisis/guardados` | Índice de los informes y análisis ya archivados |
| GET | `/api/analisis/guardados/{tipo}?alcance=` | Último informe archivado de ese tipo y alcance |
| DELETE | `/api/analisis/guardados/{tipo}?alcance=` | Descarta un informe archivado |
| POST | `/api/analisis/sugerir/indicadores/{codigo}` | Indicadores propuestos para un proceso |
| POST | `/api/analisis/sugerir/sipoc/{codigo}` | Caracterización SIPOC propuesta |
| POST | `/api/analisis/sugerir/causas/{codigo}` | Causas Ishikawa y oportunidades propuestas |
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

### Hojas del resto del estado (opcionales)

Además de las mediciones, el libro puede traer el trabajo que se hace dentro del sistema. Son las mismas hojas que produce "Exportar Excel", con los mismos encabezados, así que **el libro exportado se vuelve a subir tal cual**:

| Hoja | Qué trae |
|---|---|
| `Organizacion` | Nombre y sector de la entidad |
| `Inventario` | Anexo 1: jerarquía, producto y base legal de cada proceso |
| `Fichas SIPOC` | Anexo 2: caracterización; las listas van en una celda separadas por `\|` |
| `Indicadores` | Anexo 4: tipo, fórmula, fuente, responsable y línea base |
| `Ishikawa` | Causas 6M, cuáles son raíz y su peso |
| `Oportunidades` | Oportunidades con costo, impacto, probabilidad y consecuencia |
| `Proyeccion` | Valor proyectado por mes tras la mejora (alimenta Antes/Después) |
| `Gestion del cambio` | Plan de Lewin: etapa, acción, responsable, fecha y estado |

Las hojas calculadas del export (`Resumen`, `Antes-Despues`) y las columnas calculadas (Avance T1, Semáforo, Factibilidad, Nivel de riesgo) se ignoran al reimportar. La importación es **idempotente**: se actualiza por código de proceso, nombre de indicador y mes, así que resubir el mismo archivo no duplica nada. Las filas cuyo código no exista se omiten sin abortar la importación.

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

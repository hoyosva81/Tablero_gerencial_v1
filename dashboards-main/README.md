# SAMA Dashboards

Una colección de dashboards para monitoreo y análisis de diversas fuentes de datos, construida con React, TypeScript y Material UI.

## 📋 Requisitos Previos

- Node.js >= 18.x
- pnpm >= 8.x

## 🚀 Instalación y Ejecución

### 1. Instalar Dependencias

```bash
pnpm install
```

### 2. Configurar Variables de Entorno

Copia `.env.example` a `.env.local` y ajusta los valores según sea necesario:

```bash
cp .env.example .env.local
```

### 3. Iniciar Servidor de Desarrollo

```bash
pnpm dev
```

La aplicación se abrirá automáticamente en `http://localhost:5173`.

## 📦 Scripts Disponibles

- `pnpm dev` - Inicia el servidor de desarrollo (Vite)
- `pnpm build` - Construye la aplicación para producción
- `pnpm preview` - Vista previa local de la build de producción
- `pnpm test` - Ejecuta los tests (Vitest)
- `pnpm lint` - Ejecuta el linter (ESLint)
- `pnpm typecheck` - Verificación de tipos sin emitir salida (`tsc --noEmit`)

## 🏗️ Estructura del Proyecto

```
dashboards/
├── public/          # Archivos estáticos
├── src/
│   ├── assets/      # Imágenes, fuentes, etc.
│   ├── components/  # Componentes reutilizables
│   ├── dev/         # Herramientas exclusivas de desarrollo (DEV ONLY)
│   ├── hooks/       # Custom React hooks
│   ├── pages/       # Páginas/dashboards principales
│   ├── services/    # Funciones de obtención de datos
│   ├── store/       # Estado global (Zustand)
│   ├── styles/      # Estilos globales
│   ├── types/       # Definiciones de tipos TypeScript
│   ├── App.tsx      # Componente principal
│   ├── main.tsx     # Punto de entrada
│   ├── theme.ts     # Configuración de tema Material UI
│   └── vite-env.d.ts
├── index.html       # Punto de entrada HTML
├── package.json     # Dependencias del proyecto
├── tsconfig.json    # Configuración de TypeScript
├── vite.config.ts   # Configuración de Vite
└── vitest.config.ts # Configuración de Vitest
```

## 🔔 Notificaciones de Alertas

La aplicación muestra *toasts* apilados en la esquina **superior derecha** (máximo 3 visibles a la vez, el resto espera en una cola FIFO) por cada alerta nueva detectada mientras la app está abierta:

- Un *hook* de fondo (`useAlertasBackground`) consulta la página 1 de `/v1/alertas` cada 5 minutos, sin importar la vista en la que esté el usuario. Comparte la misma clave de caché que la tabla del Registro de Alertas (`['alarmas', 1]`), por lo que no se duplican peticiones.
- La deduplicación se persiste en `localStorage` (`sama-alerts:last-connection` y `sama-alerts:notified-ids`, con tope de 200 ids): cada alerta se notifica una única vez, incluso entre recargas de la página. En la primera visita solo se guarda la marca de tiempo, sin mostrar *toasts* de alertas preexistentes.
- Los *toasts* entran por la parte baja de la pila y suben cuando se retira el que tienen encima (animación `Collapse`). **No expiran por tiempo**: solo salen de pantalla por interacción del usuario (clic sobre el *toast* o botón de cerrar); si hay 3 visibles y llegan más, esperan en la cola hasta que se atienda alguno. Cada uno muestra un `Paper` con borde izquierdo del color de la alerta, el icono de advertencia, la etiqueta «ALERTA», el tipo de la alerta, la estación, el municipio y la fecha. El clic en el *toast* selecciona la alerta y navega al Registro de Alertas (la tabla vuelve a la página 0 y hace scroll hasta la fila); el botón de cerrar lo descarta sin navegar.
- Al hacerse visible un *toast* suena un aviso sintetizado con Web Audio API (sin archivos de audio), con *debounce* de 500 ms para que una ráfaga produzca un único sonido. El aviso se **repite cada 5 segundos** (`REPETIR_SONIDO_CADA_MS`, constante ajustable en `src/services/alertSound.ts`) mientras quede al menos un *toast* visible sin atender. El preset se elige y persiste en `localStorage` (`sama-alerts:sound-preset`, por defecto `campanita`) entre cuatro opciones (`ding`, `doble-beep`, `campanita`, `urgente`); si el navegador tiene el `AudioContext` suspendido por la política de *autoplay*, el aviso queda en silencio hasta el primer gesto del usuario.

### Detalle de alerta: precipitación y movimiento de masa

Al abrir el detalle de una alerta **de precipitación o de movimiento de masa**, el panel consulta `GET /v1/alertas/{id}/detalle` y muestra:

**Precipitación:**

- Una fila **«Precipitación acumulada 3 h»** (mm) tanto en la tarjeta como en la imagen compartida.
- La gráfica de barras `AlertaPrecipitacionChart` (ECharts) con la serie de buckets de 5 min de las 3 h previas al inicio de la alerta (`serie_3h`).

**Movimiento de masa** (snapshot `snapshot_mm` adjunto al detalle, tanto en el panel como en la imagen compartida):

- **Zona hidrográfica** (`zh_nombre`).
- **Lluvia 24 h** (`rainfall_24h`, mm).
- **Lluvia 90 días previos** (`rainfall_prev_90d`, mm).
- **Umbral bajo/moderado (LM)** y **Umbral moderado/alto (MH)** (`thr_lm` y `thr_mh`, mm).

Mientras la consulta está pendiente las filas muestran «Cargando…»; si falta el dato, «N/D». Para otros tipos de alerta no se renderizan filas específicas.

Como la ventana es pasada e inmutable, la consulta usa `staleTime` infinito en React Query. Requiere el endpoint homónimo de `api-public` (issue #58) con soporte de `snapshot_mm` (issue api-public #60, PR api-public #61).

### Panel de simulación (DEV ONLY)

En desarrollo aparece un mini-panel flotante (`src/dev/FakeAlertButton.tsx`) con tres controles: **«Simular alerta»** (inyecta una alerta falsa en la caché de React Query para probar el flujo de notificaciones de punta a punta), un **selector de preset de sonido** y **«Probar sonido»** (reproduce el preset sin necesidad de *toast*, aprovechando el clic para desbloquear el `AudioContext`). Fuera del entorno de desarrollo el componente no renderiza nada. Para eliminarlo definitivamente: borrar la carpeta `src/dev/` y el *import* y el render marcados con el comentario `// DEV ONLY` en `src/App.tsx`.

## 🛠️ Stack Tecnológico

- **React 19** - Framework UI
- **TypeScript** - Tipado estático
- **Vite 7** - Build tool y dev server
- **Material UI (MUI) v9** - Componentes UI
- **MUI X DataGrid** - Tablas de datos
- **ECharts 6** - Gráficas
- **TanStack React Query 5** - Gestión de estado del servidor
- **Zustand 5** - Gestión de estado global
- **React Router 6** - Enrutamiento
- **Vitest** - Testing

## 📝 Convenciones de Código

Consulta [.github/copilot-instructions.md](.github/copilot-instructions.md) para:
- Convenciones de nombres (Components, hooks, services, types)
- Estructura del proyecto
- Patrones de codificación
- Reglas de seguridad
- Convenciones de estilos
- Lenguaje: Español para comentarios y documentación

## 📄 Licencia

Ver archivo [LICENSE](LICENSE) para más detalles.

# PADRÓN RH — Paquete Frontend y Contenedor Electron

Aplicación de interfaz de usuario para **Carnitas y Carne Asada PADRÓN**, construida con **React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Electron 44**.

Para consultar la arquitectura detallada de componentes, diseño y servicios, revisa [`../DOCUMENTACION_FRONTEND.md`](../DOCUMENTACION_FRONTEND.md) y el [`../MANUAL_TECNICO_Y_FLUJO.md`](../MANUAL_TECNICO_Y_FLUJO.md).

---

## Scripts Disponibles

Dentro del directorio `frontend/`:

| Comando | Descripción |
| :--- | :--- |
| `npm run dev:vite` | Inicia únicamente el servidor de desarrollo de Vite en `http://localhost:5173` (con proxy hacia `127.0.0.1:8080`). |
| `npm run start:electron` | Inicia la ventana de Electron levantando automáticamente el binario `padron.exe`. |
| `npm run dev` | Ejecuta simultáneamente el servidor Vite y la ventana de Electron con recarga en caliente. |
| `npm run build` | Compila TypeScript (`tsc`) y genera el bundle de producción en `frontend/dist/`. |
| `npm run build:electron` | Compila el frontend y empaqueta los ejecutables de Windows (`PADRON RH Portable.exe` y `PADRON RH Setup 1.0.0.exe`) en `frontend/dist/`. |

> **Nota para redes con inspección SSL/TLS corporativa:** Si al ejecutar `electron-builder` por primera vez ocurre un error de certificado al descargar herramientas de construcción, ejecuta:
> ```powershell
> $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; $env:NODE_OPTIONS="--use-system-ca"; npm run build:electron
> ```

---

## Recursos Embebidos (`extraResources`)

Al empaquetar con `electron-builder`, se incluyen automáticamente dentro de `resources/backend/`:
1. `recursos/padron.exe` — Servidor API REST compilado en Go con SQLite integrado.
2. `recursos/padron.db` — Base de datos semilla inicial para equipos limpios.
3. `electron/icon.ico` — Ícono oficial de PADRÓN aplicado al ejecutable, instalador y barra de tareas de Windows.

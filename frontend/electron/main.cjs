const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('node:child_process');
const { createServer } = require('node:net');
const { mkdir } = require('node:fs/promises');
const fs = require('node:fs');
const path = require('node:path');

let apiProcess = null;
let baseApi = '';
let mainWindow = null;

// Bloqueo de instancia única
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function puertoLibre() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 8080;
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

async function esperarApi(url) {
  for (let intento = 0; intento < 50; intento++) {
    try {
      const res = await fetch(`${url}/salud`, { signal: AbortSignal.timeout(500) });
      if (res.ok) return true;
    } catch {
      // Backend aún no responde, reintentar
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`La API local PADRÓN no respondió a tiempo en ${url}/salud`);
}

async function iniciarApi() {
  if (process.env.PADRON_API_URL) {
    baseApi = process.env.PADRON_API_URL.replace(/\/$/, '');
    console.log(`[PADRON] Usando URL externa configurada: ${baseApi}`);
    await esperarApi(baseApi);
    return;
  }

  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  const raizDatos = portableDir || app.getPath('userData');
  const carpetaDatos = path.join(raizDatos, 'PADRON-datos');
  await mkdir(carpetaDatos, { recursive: true });

  let ejecutable = '';
  if (app.isPackaged) {
    ejecutable = path.join(process.resourcesPath, 'backend', 'padron.exe');
  } else {
    const candidatos = [
      path.resolve(__dirname, '..', 'recursos', 'padron.exe'),
      path.resolve(__dirname, '..', '..', 'entregable', 'padron.exe'),
      path.resolve(process.cwd(), 'recursos', 'padron.exe'),
      path.resolve(process.cwd(), '..', 'entregable', 'padron.exe'),
      path.resolve(process.cwd(), 'entregable', 'padron.exe'),
    ];
    for (const c of candidatos) {
      if (fs.existsSync(c)) {
        ejecutable = c;
        break;
      }
    }
  }

  if (!ejecutable || !fs.existsSync(ejecutable)) {
    throw new Error('No se encontró el ejecutable padron.exe en recursos ni entregable.');
  }

  const puerto = await puertoLibre();
  baseApi = `http://127.0.0.1:${puerto}`;
  const rutaBd = path.join(carpetaDatos, 'padron.db');

  console.log(`[PADRON] Iniciando API en ${baseApi} con BD en ${rutaBd}`);
  apiProcess = spawn(ejecutable, ['-puerto', String(puerto), '-bd', rutaBd], {
    windowsHide: true,
    env: { ...process.env },
  });

  apiProcess.stdout.on('data', (d) => console.log('[PADRON API]', String(d).trim()));
  apiProcess.stderr.on('data', (d) => console.error('[PADRON API ERR]', String(d).trim()));
  apiProcess.on('exit', (code) => {
    console.log(`[PADRON API] Proceso finalizó con código ${code}`);
    apiProcess = null;
  });

  await esperarApi(baseApi);
  console.log(`[PADRON API] Servicio listo y verificado en ${baseApi}`);
}

function limpiarApi() {
  if (apiProcess && !apiProcess.killed) {
    console.log('[PADRON] Terminando proceso de Go API...');
    try {
      apiProcess.kill();
    } catch (e) {
      console.error(e);
    }
    apiProcess = null;
  }
}

// IPC Handlers
ipcMain.on('padron:get-base-url', (event) => {
  event.returnValue = baseApi;
});

ipcMain.on('padron:get-api-url', (event) => {
  event.returnValue = `${baseApi}/api/v1`;
});

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: 'PADRÓN — Recursos Humanos y Operación',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Determinar URL o archivo a cargar
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (!app.isPackaged) {
    try {
      const res = await fetch(devUrl, { signal: AbortSignal.timeout(600) });
      if (res.ok) {
        console.log(`[PADRON] Conectado a servidor Vite dev en ${devUrl}`);
        await mainWindow.loadURL(devUrl);
        return;
      }
    } catch {
      // Vite no está corriendo, cargar archivo compilado dist/index.html
    }
  }

  const distPath = path.join(__dirname, '..', 'dist', 'index.html');
  if (fs.existsSync(distPath)) {
    console.log(`[PADRON] Cargando aplicación desde ${distPath}`);
    await mainWindow.loadFile(distPath);
  } else {
    console.log(`[PADRON] Cargando URL ${devUrl}`);
    await mainWindow.loadURL(devUrl);
  }
}

app.whenReady().then(async () => {
  try {
    await iniciarApi();
  } catch (err) {
    console.error('[PADRON] Error al iniciar API Go:', err);
  }
  await createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  limpiarApi();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', limpiarApi);
app.on('will-quit', limpiarApi);
process.on('exit', limpiarApi);
process.on('SIGINT', () => {
  limpiarApi();
  process.exit(0);
});
process.on('SIGTERM', () => {
  limpiarApi();
  process.exit(0);
});

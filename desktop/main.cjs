// Proceso principal: arranca el servidor local (solo 127.0.0.1), abre la ventana y gestiona cierre y actualizaciones.
const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require("electron");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const updater = require("./updater.cjs");

const token = crypto.randomBytes(24).toString("hex");
const dataDir = process.env.MENTEACTIVA_DATA_DIR || path.join(app.getPath("userData"), "datos");
let server = null;
let port = 0;
let win = null;
let quitting = false;

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

ipcMain.on("app:version", (e) => { e.returnValue = app.getVersion(); });

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

function bundleDir() {
  return app.isPackaged ? path.join(process.resourcesPath, "app-bundle") : path.join(__dirname, "app-bundle");
}

function startServer() {
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",          // usa el propio Electron como Node: no hay que instalar nada
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",              // solo accesible desde este equipo
    DEMO_MODE: "0",
    MENTEACTIVA_DATA_DIR: dataDir,
    MENTEACTIVA_DESKTOP_TOKEN: token,
    NEXT_TELEMETRY_DISABLED: "1",
  };
  server = spawn(process.execPath, [path.join(bundleDir(), "server.js")], { cwd: bundleDir(), env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  server.stdout.on("data", (d) => process.stdout.write(`[servidor] ${d}`));
  server.stderr.on("data", (d) => process.stderr.write(`[servidor] ${d}`));
  server.on("exit", (code) => {
    server = null;
    if (!quitting) {
      dialog.showErrorBox("MenteActiva Plagio 0", `El servidor interno se detuvo (código ${code}). La aplicación se cerrará; tus datos están a salvo.`);
      app.quit();
    }
  });
}

function waitForServer(timeoutMs = 40000) {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get({ host: "127.0.0.1", port, path: "/entrar", timeout: 1500 }, (res) => { res.resume(); resolve(); });
      req.on("error", retry); req.on("timeout", () => { req.destroy(); retry(); });
    };
    const retry = () => (Date.now() - t0 > timeoutMs ? reject(new Error("El servidor interno no respondió a tiempo.")) : setTimeout(tryOnce, 300));
    tryOnce();
  });
}

function flushData() {
  return new Promise((resolve) => {
    if (!port) return resolve();
    const req = http.request({ host: "127.0.0.1", port, path: "/api/desktop/flush", method: "POST", headers: { "x-desktop-token": token }, timeout: 4000 }, (res) => { res.resume(); resolve(); });
    req.on("error", () => resolve()); req.on("timeout", () => { req.destroy(); resolve(); });
    req.end();
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 380, minHeight: 600, backgroundColor: "#000000", show: false,
    title: "MenteActiva Plagio 0",
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.once("ready-to-show", () => win.show());
  const origin = `http://127.0.0.1:${port}`;
  // la ventana solo navega por la app; todo enlace externo se abre en el navegador del sistema
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith(origin)) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  win.loadURL(origin + "/");
  win.on("closed", () => { win = null; });
}

function buildMenu() {
  const t = [
    { label: "Archivo", submenu: [{ role: "quit", label: "Salir" }] },
    { label: "Edición", submenu: [{ role: "undo", label: "Deshacer" }, { role: "redo", label: "Rehacer" }, { type: "separator" }, { role: "cut", label: "Cortar" }, { role: "copy", label: "Copiar" }, { role: "paste", label: "Pegar" }, { role: "selectAll", label: "Seleccionar todo" }] },
    { label: "Ver", submenu: [{ role: "resetZoom", label: "Tamaño real" }, { role: "zoomIn", label: "Acercar" }, { role: "zoomOut", label: "Alejar" }, { role: "togglefullscreen", label: "Pantalla completa" }] },
    { label: "Ayuda", submenu: [
      { label: "Buscar actualizaciones", click: () => updater.check(true) },
      { label: "Abrir carpeta de datos", click: () => shell.openPath(dataDir) },
      { type: "separator" },
      { label: `Versión ${app.getVersion()}`, enabled: false },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(t));
}

app.whenReady().then(async () => {
  try {
    port = await freePort();
    startServer();
    await waitForServer();
    buildMenu();
    createWindow();
    updater.setup({ dataDir, flushData });
  } catch (e) {
    dialog.showErrorBox("MenteActiva Plagio 0", String(e.message || e));
    app.quit();
  }
});

app.on("window-all-closed", () => app.quit());

// Al salir: pedir al servidor que guarde, y solo después pararlo (en Windows no hay señales de cierre)
app.on("before-quit", (e) => {
  if (quitting) return;
  quitting = true;
  e.preventDefault();
  flushData().then(() => {
    if (server) { server.once("exit", () => app.exit(0)); server.kill(); setTimeout(() => app.exit(0), 2500); }
    else app.exit(0);
  });
});

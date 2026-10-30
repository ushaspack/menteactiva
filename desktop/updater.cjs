// Actualizaciones: comprueba al arrancar y cada 4 horas, avisa a la interfaz y espera a que la persona pulse «Actualizar».
// Nada se descarga ni se instala sin ese clic. Antes de instalar se guarda una copia de los datos.
const { app, ipcMain, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const FOUR_HOURS = 4 * 60 * 60 * 1000;
let autoUpdater = null;
let state = { status: "idle", version: null, percent: 0, notes: "", error: "", lastChecked: null };
let timer = null;
let manualCheck = false; // los fallos de comprobaciones automáticas (sin red, sin versiones aún) no se enseñan

function emit(patch) {
  state = { ...state, ...patch };
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send("update:state", state);
}

const plain = (n) => {
  const t = Array.isArray(n) ? n.map((x) => x.note || "").join("\n") : String(n || "");
  return t.replace(/<[^>]*>/g, "").trim().slice(0, 600);
};

function backupData(dataDir, toVersion) {
  try {
    const src = path.join(dataDir, "data.json");
    if (!fs.existsSync(src)) return;
    const dir = path.join(path.dirname(dataDir), "copias");
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.copyFileSync(src, path.join(dir, `data-antes-de-${toVersion}-${stamp}.json`));
    const old = fs.readdirSync(dir).filter((f) => f.startsWith("data-antes-de-")).sort().reverse().slice(5);
    for (const f of old) fs.rmSync(path.join(dir, f), { force: true });
  } catch (e) { console.error("[copia] no se pudo copiar:", e.message); }
}

function setup({ dataDir, flushData }) {
  ipcMain.handle("update:state", () => state);
  ipcMain.handle("update:check", () => check(true));
  ipcMain.handle("update:download", () => download());
  ipcMain.handle("update:install", async () => {
    if (state.status !== "ready") return;
    await flushData();           // guarda lo último antes de cerrar
    backupData(dataDir, state.version);
    autoUpdater.quitAndInstall(false, true);
  });

  // En desarrollo (sin empaquetar) no hay nada que actualizar, salvo que se fuerce para probar.
  const testFeed = process.env.MENTEACTIVA_UPDATE_FEED; // p. ej. http://127.0.0.1:4000
  if (!app.isPackaged && !testFeed) { emit({ status: "idle", error: "" }); return; }

  ({ autoUpdater } = require("electron-updater"));
  autoUpdater.autoDownload = false;          // la persona decide
  autoUpdater.autoInstallOnAppQuit = false;  // y también cuándo se instala
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;
  if (testFeed) {
    autoUpdater.forceDevUpdateConfig = true;
    autoUpdater.setFeedURL({ provider: "generic", url: testFeed });
  }

  autoUpdater.on("checking-for-update", () => emit({ status: "checking", error: "" }));
  autoUpdater.on("update-not-available", () => emit({ status: "none", lastChecked: new Date().toISOString() }));
  autoUpdater.on("update-available", (info) =>
    emit({ status: "available", version: info.version, notes: plain(info.releaseNotes), percent: 0, lastChecked: new Date().toISOString() }));
  autoUpdater.on("download-progress", (p) => emit({ status: "downloading", percent: Math.round(p.percent) }));
  autoUpdater.on("update-downloaded", (info) => emit({ status: "ready", version: info.version, percent: 100 }));
  autoUpdater.on("error", (err) => {
    const msg = String(err && err.message ? err.message : err).slice(0, 300);
    // una comprobación automática que falla (sin internet, aún sin versiones publicadas) no molesta; una manual o una descarga sí
    if (manualCheck || state.status === "downloading") emit({ status: "error", error: msg });
    else { console.error("[actualizaciones]", msg); emit({ status: "idle", error: "" }); }
  });

  setTimeout(() => check(false), 10_000);                       // no frena el arranque
  timer = setInterval(() => check(false), FOUR_HOURS);
  timer.unref?.();
}

async function check(manual = false) {
  if (!autoUpdater) return state;
  if (["checking", "downloading", "ready"].includes(state.status)) return state;
  manualCheck = manual;
  try { await autoUpdater.checkForUpdates(); } catch (e) {
    if (manual) emit({ status: "error", error: String(e.message || e).slice(0, 300) });
    else { console.error("[actualizaciones]", e.message || e); emit({ status: "idle", error: "" }); }
  }
  return state;
}

async function download() {
  if (!autoUpdater || state.status !== "available") return state;
  emit({ status: "downloading", percent: 0 });
  try { await autoUpdater.downloadUpdate(); } catch (e) { emit({ status: "error", error: String(e.message || e).slice(0, 300) }); }
  return state;
}

module.exports = { setup, check, getState: () => state };

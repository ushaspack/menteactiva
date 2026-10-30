// Puente mínimo y explícito entre la interfaz y el proceso principal (sin acceso a Node desde la página).
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("menteactivaDesktop", {
  version: ipcRenderer.sendSync("app:version"),
  platform: process.platform,
  getUpdateState: () => ipcRenderer.invoke("update:state"),
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  downloadUpdate: () => ipcRenderer.invoke("update:download"),
  installUpdate: () => ipcRenderer.invoke("update:install"),
  onUpdateState: (cb) => {
    const fn = (_e, state) => cb(state);
    ipcRenderer.on("update:state", fn);
    return () => ipcRenderer.removeListener("update:state", fn);
  },
});

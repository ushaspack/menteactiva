// Guardado en disco para el modo local (app de escritorio). Si MENTEACTIVA_DATA_DIR no está definida, no hace nada
// y todo sigue en memoria (modo web de pruebas).
import fs from "node:fs";
import path from "node:path";

const VERSION = 1;
type Snapshotter = () => unknown;
const providers = new Map<string, Snapshotter>();
let timer: NodeJS.Timeout | null = null;
let cache: { v: number; data: Record<string, unknown> } | null | undefined;
let hooked = false;

export const dataDir = () => process.env.MENTEACTIVA_DATA_DIR || "";
const file = () => path.join(dataDir(), "data.json");

/** Lee el archivo una sola vez. Un archivo dañado se aparta (no se borra) y se empieza de cero. */
export function loadSnapshot(name: string): unknown {
  if (!dataDir()) return undefined;
  if (cache === undefined) {
    cache = null;
    try {
      const raw = fs.readFileSync(file(), "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v === VERSION && typeof parsed.data === "object") cache = parsed;
      else throw new Error("formato desconocido");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
        try {
          fs.renameSync(file(), path.join(dataDir(), `data.dañado-${Date.now()}.json`));
          console.error("[datos] data.json no se pudo leer; se guardó aparte y se empieza de cero:", (e as Error).message);
        } catch { /* nada más que hacer */ }
      }
    }
  }
  return cache?.data[name];
}

export function register(name: string, fn: Snapshotter) {
  providers.set(name, fn);
  if (!hooked && dataDir()) {
    hooked = true;
    const bye = () => flush();
    process.on("exit", bye);
    for (const sig of ["SIGTERM", "SIGINT"] as const) process.on(sig, () => { flush(); process.exit(0); });
  }
}

/** Marca que hay cambios; se escribe en unos instantes (agrupa varias acciones seguidas). */
export function markDirty() {
  if (!dataDir()) return;
  // una escritura al cabo de 1 s y otra de repaso a los 6 s, por si la acción tarda (archivos grandes)
  if (!timer) {
    timer = setTimeout(() => { timer = null; flush(); }, 1000);
    timer.unref?.();
  }
  const late = setTimeout(() => flush(), 6000);
  late.unref?.();
}

export function flush() {
  if (!dataDir() || providers.size === 0) return;
  if (timer) { clearTimeout(timer); timer = null; }
  try {
    fs.mkdirSync(dataDir(), { recursive: true });
    const data: Record<string, unknown> = {};
    for (const [k, fn] of providers) data[k] = fn();
    const tmp = `${file()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ v: VERSION, savedAt: new Date().toISOString(), data }), { mode: 0o600 });
    if (fs.existsSync(file())) fs.copyFileSync(file(), `${file()}.bak`);
    fs.renameSync(tmp, file());
  } catch (e) {
    console.error("[datos] no se pudo guardar:", (e as Error).message);
  }
}

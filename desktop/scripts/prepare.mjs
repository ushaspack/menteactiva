// Monta app-bundle/: el servidor autónomo de Next + sus archivos estáticos. Lo llama `npm run prepare-bundle`.
// Antes hay que compilar la app: cd ../app && npm run build
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, "../../app");
const out = path.resolve(here, "../app-bundle");
const standalone = path.join(app, ".next/standalone");
if (!fs.existsSync(path.join(standalone, "server.js"))) {
  console.error("Falta app/.next/standalone. Compila primero: cd app && npm run build");
  process.exit(1);
}
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(standalone, out, { recursive: true, dereference: true });
fs.cpSync(path.join(app, ".next/static"), path.join(out, ".next/static"), { recursive: true });
if (fs.existsSync(path.join(app, "public"))) fs.cpSync(path.join(app, "public"), path.join(out, "public"), { recursive: true });
// la caché de compilación no hace falta para ejecutar
fs.rmSync(path.join(out, ".next/cache"), { recursive: true, force: true });
console.log("app-bundle listo en", out);

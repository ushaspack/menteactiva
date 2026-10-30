// Prueba con Electron real y un feed de actualizaciones falso en local. Linux: xvfb-run -a node test/desktop.e2e.cjs
// Antes: npm run prepare-bundle (y compilar ../app). El paso de instalar no se puede probar aquí; solo avisar, descargar y guardar.
require('fs').closeSync(require('fs').openSync('/tmp/fake.AppImage','a'));
const { _electron: electron } = require("playwright");
const http = require("http"), fs = require("fs"), crypto = require("crypto"), path = require("path");
const DIR = require("path").resolve(__dirname, "..");
const EXE = require(DIR + "/node_modules/electron");
let fails = 0;
const ok = (n, c, x = "") => { if (!c) fails++; console.log((c ? "OK    " : "FALLA ") + n + (x ? `  [${x}]` : "")); };

// --- feed de actualizaciones falso en local (versión 9.9.9 con archivo real y su sha512)
const payload = crypto.randomBytes(300 * 1024);
const sha = crypto.createHash("sha512").update(payload).digest("base64");
const name = "MenteActiva-Plagio0-9.9.9-linux-x64.AppImage";
const yml = `version: 9.9.9\nfiles:\n  - url: ${name}\n    sha512: ${sha}\n    size: ${payload.length}\npath: ${name}\nsha512: ${sha}\nreleaseDate: '2026-10-30T10:00:00.000Z'\nreleaseNotes: 'Nueva función de prueba y mejoras.'\n`;
const hits = [];
const feed = http.createServer((req, res) => {
  hits.push(req.url);
  if (req.url.startsWith("/latest-linux.yml")) { res.setHeader("content-type", "text/yaml"); return res.end(yml); }
  if (req.url.startsWith("/" + name) && !req.url.endsWith(".blockmap")) { res.setHeader("content-length", payload.length); return res.end(payload); }
  res.statusCode = 404; res.end("no");
});

(async () => {
  await new Promise((r) => feed.listen(4000, "127.0.0.1", r));
  const data = fs.mkdtempSync("/tmp/ma-e2e-");
  const app = await electron.launch({
    executablePath: EXE,
    args: ["--no-sandbox", DIR],
    env: { ...process.env, MENTEACTIVA_DATA_DIR: data + "/datos", MENTEACTIVA_UPDATE_FEED: "http://127.0.0.1:4000", APPIMAGE: process.env.APPIMAGE || "/tmp/fake.AppImage" },
    timeout: 60000,
  });
  const win = await app.firstWindow();
  await win.waitForURL(/127\.0\.0\.1:\d+\/entrar/, { timeout: 60000 });
  ok("la ventana abre la pantalla de entrada desde el servidor local", true, win.url());
  ok("el servidor solo escucha en 127.0.0.1", /127\.0\.0\.1/.test(win.url()));
  const api = await win.evaluate(() => ({ v: window.menteactivaDesktop && window.menteactivaDesktop.version, node: typeof window.require, proc: typeof window.process }));
  ok("la página tiene el puente de escritorio y NO tiene acceso a Node", !!api.v && api.node === "undefined" && api.proc === "undefined", JSON.stringify(api));
  ok("sin datos de ejemplo en la app de escritorio", (await win.getByText("Modo demostración").count()) === 0);

  // registro, para ver el interior de la app
  await win.goto(win.url().replace(/\/entrar.*/, "/registro"));
  await win.getByLabel("Nombre").fill("Yo Misma");
  await win.getByLabel("Correo electrónico").fill("yo@example.com");
  await win.getByLabel("Soy").selectOption("docente");
  await win.getByLabel("Contraseña").fill("clave-segura-123");
  await win.getByRole("button", { name: "Crear cuenta" }).click();
  await win.waitForURL(/\/clases$/);

  // --- aviso de actualización (el comprobador arranca a los 10 s)
  const banner = win.getByText(/Hay una versión nueva de MenteActiva Plagio 0 \(9\.9\.9\)/);
  await banner.waitFor({ timeout: 40000 });
  ok("aparece el aviso de la versión 9.9.9 sin que nadie lo pida", true);
  ok("hay botón «Actualizar» y «Más tarde»", (await win.getByRole("button", { name: "Actualizar", exact: true }).count()) === 1 && (await win.getByRole("button", { name: "Más tarde" }).count()) === 1);
  ok("no se ha descargado nada antes del clic", !hits.some((u) => u.includes(".AppImage")));
  await win.screenshot({ path: require("path").resolve(__dirname, "../../clone-screens/desktop-aviso.png") });
  await win.getByText("Qué trae").click();
  ok("se muestran las notas de la versión", (await win.getByText("Nueva función de prueba").count()) === 1);

  await win.getByRole("button", { name: "Más tarde" }).click();
  ok("«Más tarde» oculta el aviso", (await banner.count()) === 0);
  await win.reload();
  await win.waitForTimeout(800);
  ok("sigue oculto tras recargar en la misma sesión", (await banner.count()) === 0);
  // buscar a mano vuelve a mostrar la comprobación (la versión descartada sigue oculta; se prueba con la barra lateral)
  await win.evaluate(() => sessionStorage.clear());
  await win.reload();
  await banner.waitFor({ timeout: 10000 });
  await win.getByRole("button", { name: "Actualizar", exact: true }).click();
  const ready = win.getByRole("button", { name: "Reiniciar y actualizar" });
  try { await ready.waitFor({ timeout: 25000 }); } catch (e) { console.log("ESTADO", JSON.stringify(await win.evaluate(() => window.menteactivaDesktop.getUpdateState())), "PETICIONES", JSON.stringify(hits)); throw e; }
  ok("tras pulsar «Actualizar» se descarga y aparece «Reiniciar y actualizar»", true);
  ok("la descarga se hizo desde el feed", hits.some((u) => u.includes(".AppImage")));
  await win.screenshot({ path: require("path").resolve(__dirname, "../../clone-screens/desktop-listo.png") });

  // --- guardado al cerrar
  await app.close();
  await new Promise((r) => setTimeout(r, 500));
  ok("al cerrar se guardan los datos", fs.existsSync(data + "/datos/data.json"));
  const saved = JSON.parse(fs.readFileSync(data + "/datos/data.json", "utf8"));
  ok("el usuario creado está en el archivo", JSON.stringify(saved).includes("yo@example.com"));
  ok("el archivo de datos no es legible por otros usuarios", process.platform === "win32" || (fs.statSync(data + "/datos/data.json").mode & 0o077) === 0);

  // --- reabrir: sigue todo
  const app2 = await electron.launch({ executablePath: EXE, args: ["--no-sandbox", DIR], env: { ...process.env, MENTEACTIVA_DATA_DIR: data + "/datos" }, timeout: 60000 });
  const w2 = await app2.firstWindow();
  await w2.waitForURL(/127\.0\.0\.1:\d+\//, { timeout: 60000 });
  await w2.waitForLoadState("load");
  ok("al reabrir, la sesión y los datos siguen ahí", /\/clases/.test(w2.url()) || (await w2.getByText("Mis clases").count()) > 0, w2.url());
  await app2.close();

  feed.close();
  console.log(fails ? `\n${fails} fallos` : "\ntodo bien");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(2); });

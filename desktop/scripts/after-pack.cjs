// electron-builder descarta las carpetas node_modules y las ocultas (.next) al copiar recursos extra.
// Por eso el servidor se copia aquí a mano, tal cual, a la carpeta de recursos de la app empaquetada.
const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  const src = path.join(__dirname, "..", "app-bundle");
  if (!fs.existsSync(path.join(src, "server.js"))) throw new Error("Falta app-bundle: ejecuta `npm run prepare-bundle` antes.");
  const resources = context.electronPlatformName === "darwin"
    ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, "Contents", "Resources")
    : path.join(context.appOutDir, "resources");
  fs.cpSync(src, path.join(resources, "app-bundle"), { recursive: true, dereference: true });
  console.log("  • app-bundle copiado a", resources);
};

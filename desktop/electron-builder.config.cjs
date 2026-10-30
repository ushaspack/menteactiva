// Las claves del repositorio llegan del entorno (las pone el flujo de GitHub); no hay nombres escritos a mano.
module.exports = {
  appId: "es.menteactiva.plagio0",
  productName: "MenteActiva Plagio 0",
  artifactName: "MenteActiva-Plagio0-${version}-${os}-${arch}.${ext}",
  directories: { output: "dist", buildResources: "build" },
  files: ["main.cjs", "preload.cjs", "updater.cjs", "package.json"],
  afterPack: "./scripts/after-pack.cjs",  // copia el servidor a los recursos (ver el script)
  asar: true,
  compression: "normal",
  win: { target: [{ target: "nsis", arch: ["x64"] }] },
  nsis: { oneClick: true, perMachine: false, deleteAppDataOnUninstall: false, runAfterFinish: true },
  mac: { target: ["dmg", "zip"], category: "public.app-category.education" },
  linux: { target: ["AppImage"], category: "Education" },
  publish: process.env.GH_OWNER && process.env.GH_REPO
    ? [{ provider: "github", owner: process.env.GH_OWNER, repo: process.env.GH_REPO, releaseType: "release" }]
    : undefined,
};

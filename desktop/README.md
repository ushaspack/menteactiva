# MenteActiva · Plagio 0 para escritorio

La misma app, instalada en tu ordenador, con tus datos en tu disco y con avisos de actualización.

## Cómo funciona
- Al abrir la app se arranca un servidor interno que **solo escucha en tu propio equipo** (127.0.0.1) y se abre una ventana con él. No hace falta instalar Node ni nada más.
- Tus datos están en una carpeta de tu usuario (menú **Ayuda → Abrir carpeta de datos**). En Windows está dentro de `%APPDATA%`. Al actualizar o desinstalar **no se borran**.
- Se guarda un segundo después de cada cambio y otra vez al cerrar. Si el archivo se dañara, la app lo aparta (no lo borra) y arranca de cero; hay copia anterior `data.json.bak`.
- Antes de instalar una actualización se guarda una copia en la carpeta `copias` (se conservan las 5 últimas).
- La app **no usa internet para nada más que buscar actualizaciones** (a GitHub). Los trabajos y las contraseñas no salen de tu equipo.

## Actualizaciones
1. Al abrir, y luego cada 4 horas, la app mira si hay una versión más nueva. También puedes hacerlo a mano: botón **Buscar actualizaciones** en el menú lateral, o **Ayuda → Buscar actualizaciones**.
2. Si la hay, sale un aviso arriba: **«Hay una versión nueva… [Actualizar] [Más tarde]»**, con las novedades desplegables.
3. **Nada se descarga ni se instala sin que pulses «Actualizar».** Se descarga solo lo que cambió (actualización diferencial) y sale una barra de progreso.
4. Al terminar, el botón pasa a **«Reiniciar y actualizar»**. Se guarda una copia de tus datos, la app se reinicia y ya está.
5. Si no hay internet o aún no hay versiones publicadas, no pasa nada ni se muestra ningún error (solo si tú lo pides con el botón).

## Publicar una versión (tú, una vez por mejora)
**Una sola vez:**
1. Crea un repositorio en GitHub y sube este proyecto. **Debe ser público**: la app instalada lee las versiones sin credenciales, y con un repositorio privado no podría. Si quieres el código privado, crea otro repositorio público solo para las versiones y cambia `GH_OWNER` y `GH_REPO` en `.github/workflows/release.yml`.
2. En el repositorio: *Settings → Actions → General → Workflow permissions → Read and write permissions*.

**Cada versión:**
```
git tag v0.2.0
git push origin v0.2.0
```
GitHub ejecuta las pruebas, construye el instalador de **Windows** (y de macOS y Linux) y los publica en *Releases*. Unos 10 a 15 minutos después, las apps instaladas avisan. El número de versión sale de la etiqueta; no hay que editar nada.

**Instalar la primera vez:** descarga `MenteActiva-Plagio0-0.2.0-win-x64.exe` de la Release y ábrelo. Se instala solo para tu usuario, sin permisos de administrador.

## Avisos que debes conocer
- **Windows SmartScreen:** el instalador no está firmado con certificado de pago, así que Windows mostrará «Windows protegió su PC» la primera vez. Pulsa *Más información → Ejecutar de todos modos*. Las actualizaciones posteriores funcionan sin firma. Para quitar el aviso hay que firmar el instalador (certificado de código o el servicio de firma de Microsoft); es opcional.
- **macOS:** sin firma de Apple (de pago) la actualización automática **no funciona**; habría que instalar cada versión a mano.
- **Linux:** funciona con AppImage.
- El icono actual es un **provisional** hecho con los colores de la marca; falta el definitivo (ver `brand.md`).

## Desarrollo
```
cd ../app && npm run build        # compila la app
cd ../desktop && npm run prepare-bundle   # monta el servidor autónomo
npm start                         # abre la app de escritorio (sin empaquetar no busca actualizaciones)
npm run dist                      # construye el instalador de tu sistema, en dist/
# prueba con Electron real y un feed de actualizaciones falso (Linux: con xvfb):
xvfb-run -a node test/desktop.e2e.cjs
```
Para probar los avisos sin publicar nada: `MENTEACTIVA_UPDATE_FEED=http://127.0.0.1:4000 npm start` con un servidor que sirva `latest.yml`.

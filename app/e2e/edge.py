#!/usr/bin/env python3
"""Casos límite, negativos y de seguridad (ver test-plan.md). Uso: python3 e2e/edge.py [URL_BASE]
Crea sus propias cuentas con correos únicos; no depende del estado de flow.py."""
import re, sys, time, uuid
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3100"
AXE = Path(__file__).resolve().parents[1] / "node_modules/axe-core/axe.min.js"
ALERT = "[role=alert]:not(#__next-route-announcer__)"
RUN = uuid.uuid4().hex[:6]
PW = "clave-segura-123"
TEXT = ("La memoria de trabajo permite mantener y manipular información durante breves periodos de tiempo. "
        "Según los modelos más influyentes, este sistema se divide en componentes especializados que cooperan con la atención. ")
results, errors, five_xx = [], [], []


def check(case, name, ok, extra=""):
    results.append((case, ok))
    print(("OK    " if ok else "FALLA ") + f"{case} {name}" + (f"  [{extra}]" if extra else ""))


def not_found(p):
    return p.get_by_text("No encontramos esta página").count() == 1


def new_page(browser, w=1280):
    ctx = browser.new_context(viewport={"width": w, "height": 800})
    p = ctx.new_page()
    # los 404 de documento son esperados (las pruebas visitan páginas ajenas a propósito); los de recursos no
    p.on("console", lambda m: errors.append(m.text) if m.type == "error" and "status of 404" not in m.text else None)
    p.on("pageerror", lambda e: errors.append(str(e)))
    p.on("response", lambda r: five_xx.append(f"{r.status} {r.url}") if r.status >= 500 or (r.status == 404 and r.request.resource_type != "document") else None)
    return ctx, p


def register(browser, role, name):
    ctx, p = new_page(browser)
    email = f"{name.lower().replace(' ', '')}-{RUN}@example.com"
    p.goto(f"{BASE}/registro")
    p.get_by_label("Nombre").fill(name)
    p.get_by_label("Correo electrónico").fill(email)
    p.get_by_label("Soy").select_option(role)
    p.get_by_label("Contraseña").fill(PW)
    p.get_by_role("button", name="Crear cuenta").click()
    p.wait_for_url(re.compile(r"/clases$"))
    return ctx, p, email


def demo(browser, label):
    ctx, p = new_page(browser)
    p.goto(f"{BASE}/entrar")
    p.get_by_role("button", name=label).click()
    p.wait_for_url(re.compile(r"/clases$"))
    return ctx, p


def submit_text(p, assignment, title, text, wait=True):
    p.goto(f"{BASE}/tareas/{assignment}")
    p.get_by_label("Título del trabajo").fill(title)
    p.get_by_label("Texto del trabajo").fill(text)
    p.get_by_role("button", name="Entregar trabajo").click()
    if wait:
        p.wait_for_url(re.compile(r"/informe"), timeout=20000)


with sync_playwright() as pw:
    b = pw.chromium.launch()

    # ---------- F03 permisos: un segundo docente no ve nada del primero
    tctx, t2, _ = register(b, "docente", "Docente Dos")
    t2.goto(f"{BASE}/clases")
    check("F02-N1", "un docente nuevo no ve clases ajenas", t2.get_by_text("Comunicación Escrita").count() == 0)
    for path, case in [("/clases/c-comesc", "F02-N2"), ("/tareas/a-ensayo", "F05-N1")]:
        t2.goto(f"{BASE}{path}")
        check(case, f"docente ajeno ve «no encontrada» en {path}", not_found(t2) and t2.get_by_text("Ensayo").count() == 0)
    d_ctx, d = demo(b, "Entrar como Dra. Marta Vidal")
    d.goto(f"{BASE}/tareas/a-ensayo")
    href = d.locator("tbody tr").first.get_by_role("link", name="Ver informe").get_attribute("href")
    t2.goto(f"{BASE}{href}")
    check("F09-N1", "docente ajeno no abre el informe de otra clase", not_found(t2) and t2.locator("mark").count() == 0)
    t2.goto(f"{BASE}/clases/c-comesc/tareas/nueva")
    check("F06-N1", "docente ajeno no puede abrir «Crear tarea» en una clase ajena", t2.get_by_label("Título de la tarea").count() == 0)

    # ---------- F01 cuentas
    ctx, p = new_page(b)
    p.goto(f"{BASE}/registro")
    p.get_by_label("Nombre").fill("Dup")
    p.get_by_label("Correo electrónico").fill(f"docentedos-{RUN}@example.com")
    p.get_by_label("Contraseña").fill(PW)
    p.get_by_role("button", name="Crear cuenta").click()
    p.wait_for_selector(ALERT)
    check("F01-N1", "correo repetido se rechaza", "Ya existe" in p.locator(ALERT).inner_text())
    p.goto(f"{BASE}/entrar")
    p.get_by_label("Correo electrónico").fill(f"DOCENTEDOS-{RUN}@EXAMPLE.COM")
    p.get_by_label("Contraseña").fill(PW)
    p.get_by_role("button", name="Entrar", exact=True).click()
    try:
        p.wait_for_url(re.compile(r"/clases$"), timeout=8000); ok = True
    except Exception:
        ok = False
    check("F01-E1", "el correo no distingue mayúsculas al entrar", ok)
    ctx.close()

    # ---------- F01 sesión caducada / cerrada en otra pestaña
    sctx, s1, _ = register(b, "estudiante", "Sesion Uno")
    tab2 = sctx.new_page()
    tab2.goto(f"{BASE}/clases")
    s1.get_by_role("button", name="Salir").click()
    s1.wait_for_url(re.compile(r"/entrar$"))
    tab2.get_by_label("Clave de la clase").fill("MET-1170")
    tab2.get_by_role("button", name="Unirme").click()
    tab2.wait_for_timeout(1200)
    check("F01-E2", "acción en otra pestaña tras cerrar sesión lleva a /entrar", tab2.url.endswith("/entrar"), tab2.url)
    sctx.close()

    # ---------- F02 unirse: fuerza bruta de claves
    sctx, s2, _ = register(b, "estudiante", "Fuerza Bruta")
    msgs = []
    for i in range(12):
        s2.goto(f"{BASE}/clases")
        s2.get_by_label("Clave de la clase").fill(f"ZZZ-{1000 + i}")
        s2.get_by_role("button", name="Unirme").click()
        s2.wait_for_selector(ALERT)
        msgs.append(s2.locator(ALERT).inner_text())
    check("F02-N3", "adivinar claves de clase tiene límite de intentos", any("Demasiados" in m for m in msgs), msgs[-1][:60])
    sctx.close()

    # ---------- F08 entregas (estudiante nuevo en MET-1170 / a-resena es de c-comesc: usar COM-4821)
    sctx, s, _ = register(b, "estudiante", "Estudiante Prueba")
    s.get_by_label("Clave de la clase").fill("COM-4821")
    s.get_by_role("button", name="Unirme").click()
    s.wait_for_url(re.compile(r"/clases/c-comesc"))

    # entrega con emoji, acentos y HTML
    html_title = "Reseña <b>ñandú</b> 😀 & “comillas”"
    submit_text(s, "a-resena", html_title, TEXT + "Esto incluye <script>window.__xss=1</script> y emoji 😀 y más palabras para llegar al mínimo.")
    check("F08-E1", "título con HTML/emoji se muestra literal y sin ejecutar", s.evaluate("window.__xss") is None)
    s.goto(f"{BASE}/tareas/a-resena")
    check("F08-E2", "el título con HTML aparece como texto", s.get_by_text("<b>ñandú</b>").count() >= 1)

    # título de 160 y texto largo
    big = (TEXT * 40).strip()
    t0 = time.time()
    submit_text(s, "a-resena", "T" * 160, big)
    check("F08-E3", "título de 160 caracteres y texto largo se aceptan", True, f"{time.time()-t0:.1f}s")
    s.goto(f"{BASE}/tareas/a-resena")
    check("F08-E4", "con título de 160 caracteres sin desbordes (1280)", not s.evaluate("document.documentElement.scrollWidth > innerWidth"))

    # doble clic: no debe crear dos versiones
    s.goto(f"{BASE}/tareas/a-resena")
    before = s.get_by_text(re.compile(r"^Versión \d+")).count()
    s.get_by_label("Título del trabajo").fill("Doble clic")
    s.get_by_label("Texto del trabajo").fill(TEXT + "Fin de la prueba de doble clic con palabras suficientes para pasar el mínimo.")
    btn = s.get_by_role("button", name="Entregar trabajo")
    btn.dblclick()
    s.wait_for_url(re.compile(r"/informe"), timeout=20000)
    s.goto(f"{BASE}/tareas/a-resena")
    after = s.get_by_text(re.compile(r"^Versión \d+")).count()
    check("F08-E5", "doble clic en Entregar crea una sola versión", after - before == 1, f"{before}->{after}")

    # texto de 20 palabras justo en el límite
    submit_text(s, "a-resena", "Límite", " ".join(["palabra"] * 19), wait=False)
    s.wait_for_selector(ALERT)
    check("F08-E6", "19 palabras se rechazan", "demasiado corto" in s.locator(ALERT).inner_text())
    s.get_by_label("Texto del trabajo").fill(" ".join(["palabra"] * 20))
    s.get_by_role("button", name="Entregar trabajo").click()
    try:
        s.wait_for_url(re.compile(r"/informe"), timeout=10000); ok = True
    except Exception:
        ok = False
    check("F08-E7", "20 palabras se aceptan", ok)

    # texto por encima del máximo
    s.goto(f"{BASE}/tareas/a-resena")
    s.get_by_label("Título del trabajo").fill("Enorme")
    s.get_by_label("Texto del trabajo").fill("palabra " * 400000)
    s.get_by_role("button", name="Entregar trabajo").click()
    s.wait_for_selector(ALERT, timeout=30000)
    check("F08-E8", "un texto enorme se rechaza con mensaje claro", "demasiado largo" in s.locator(ALERT).inner_text(), s.locator(ALERT).inner_text()[:50])

    # pestaña de atrás y recarga a mitad de flujo
    s.goto(f"{BASE}/tareas/a-resena")
    s.get_by_label("Título del trabajo").fill("A medias")
    s.reload()
    check("F08-E9", "recargar a mitad del formulario no rompe la página", s.get_by_role("button", name="Entregar trabajo").count() == 1)
    s.goto(f"{BASE}/clases"); s.go_back(); s.wait_for_url(re.compile(r"/tareas/a-resena"))
    check("F08-E10", "volver atrás conserva la tarea", s.get_by_role("button", name="Entregar trabajo").count() == 1)

    # estudiante no ve entregas ajenas ni informes de otro
    ana_ctx, ana = demo(b, "Ana Ruiz")
    ana.goto(f"{BASE}/tareas/a-resena")
    check("F08-N1", "Ana no ve las entregas del estudiante nuevo", ana.get_by_text("Estudiante Prueba").count() == 0)
    ana_ctx.close()

    # estudiante ajeno a la clase
    xctx, x, _ = register(b, "estudiante", "Ajeno Uno")
    x.goto(f"{BASE}/tareas/a-resena")
    check("F08-N2", "estudiante no matriculado ve «no encontrada» en la tarea", not_found(x))
    x.goto(f"{BASE}/clases/c-comesc")
    check("F08-N3", "estudiante no matriculado ve «no encontrada» en la clase", not_found(x))
    xctx.close()

    # plazo cerrado: no se puede entregar forzando la tarea con plazo vencido sin tardías
    # (la seed no tiene una cerrada; se crea una con fecha pasada)
    d.goto(f"{BASE}/clases/c-comesc/tareas/nueva")
    d.get_by_label("Título de la tarea").fill("Cerrada ayer")
    d.get_by_label(re.compile("Fecha y hora límite")).fill("2026-10-01T10:00")
    if d.get_by_label(re.compile("tard", re.I)).count():
        lbl = d.get_by_label(re.compile("tard", re.I)).first
        if lbl.is_checked(): lbl.uncheck()
    d.get_by_role("button", name="Crear tarea").click()
    d.wait_for_url(re.compile(r"/tareas/a-"))
    closed_url = d.url
    s.goto(closed_url)
    check("F08-N4", "tarea con plazo cerrado avisa y no muestra el formulario",
          s.get_by_text("Ya no se aceptan entregas").count() == 1 and s.get_by_role("button", name="Entregar trabajo").count() == 0)

    # ---------- F05 informe: huella horaria y tardío
    d.goto(f"{BASE}/tareas/a-ensayo")
    check("F05-E1", "la bandeja muestra horas en Madrid (formato 24 h con día)", d.get_by_text(re.compile(r"\d{1,2}:\d{2}")).count() >= 1)

    # ---------- Accesibilidad con axe en las pantallas principales
    axe_src = AXE.read_text()
    pages = [("entrar", None, "/entrar"), ("registro", None, "/registro"),
             ("clases", d, "/clases"), ("clase", d, "/clases/c-comesc"), ("bandeja", d, "/tareas/a-ensayo"),
             ("informe", d, href), ("entrega", s, "/tareas/a-resena"), ("nueva clase", d, "/clases/nueva")]
    anon_ctx, anon = new_page(b)
    for name, pg, path in pages:
        q = pg or anon
        q.goto(f"{BASE}{path}")
        q.add_script_tag(content=axe_src)
        res = q.evaluate("axe.run(document, {runOnly:['wcag2a','wcag2aa','wcag21aa']}).then(r => r.violations.map(v => v.id + ' x' + v.nodes.length))")
        check("A11Y", f"axe sin violaciones en {name}", not res, ", ".join(res))

    # ---------- móvil: pantallas con datos largos
    mctx, m = new_page(b, 390)
    m.goto(f"{BASE}/entrar")
    m.get_by_role("button", name="Entrar como Dra. Marta Vidal").click()
    m.wait_for_url(re.compile(r"/clases$"))
    for path in ["/clases", "/clases/c-comesc", "/tareas/a-ensayo", href]:
        m.goto(f"{BASE}{path}")
        check("MOV", f"390 px sin desbordes en {path[:30]}", not m.evaluate("document.documentElement.scrollWidth > innerWidth"))

    b.close()

check("GLOBAL", "sin errores de consola", len(errors) == 0, "; ".join(errors[:3]))
check("GLOBAL", "sin respuestas 5xx", len(five_xx) == 0, "; ".join(five_xx[:3]))
failed = [c for c, ok in results if not ok]
print(f"\n{len(results)} casos, {len(failed)} fallos")
sys.exit(1 if failed else 0)

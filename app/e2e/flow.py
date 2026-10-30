#!/usr/bin/env python3
"""Recorrido de extremo a extremo de la rebanada vertical. Uso: python3 e2e/flow.py [URL_BASE]
Guarda capturas en replica/clone-screens/ y sale con código 1 si algo falla."""
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3100"
OUT = Path(__file__).resolve().parents[2] / "clone-screens"
OUT.mkdir(exist_ok=True)

DOC1 = ("La memoria de trabajo permite mantener y manipular información durante breves periodos de tiempo. "
        "Según los modelos más influyentes, este sistema se divide en componentes especializados que cooperan con la atención. "
        "Un componente se ocupa del material verbal, otro del material visual y un tercero coordina ambos.")

ALERT = "[role=alert]:not(#__next-route-announcer__)"
results = []
console_errors = []


def check(name, ok, extra=""):
    results.append((name, ok))
    print(("OK    " if ok else "FALLA ") + name + (f"  [{extra}]" if extra else ""))


def login(page, label):
    page.goto(f"{BASE}/entrar")
    page.get_by_role("button", name=label).click()
    page.wait_for_url(re.compile(r"/clases$"))


def logout(page):
    page.get_by_role("button", name="Salir").click()
    page.wait_for_url(re.compile(r"/entrar$"))


def no_overflow(page):
    return not page.evaluate("document.documentElement.scrollWidth > innerWidth")


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: console_errors.append(str(e)))

    # ---- S01 y acceso protegido
    page.goto(f"{BASE}/clases")
    check("sin sesión se redirige a /entrar", page.url.endswith("/entrar"))
    page.screenshot(path=str(OUT / "S01.png"), full_page=True)

    # ---- docente
    login(page, "Entrar como Dra. Marta Vidal")
    check("S02 docente muestra las clases", page.get_by_role("heading", name="Comunicación Escrita").count() == 1)
    page.screenshot(path=str(OUT / "S02.png"), full_page=True)

    page.goto(f"{BASE}/clases/c-comesc")
    page.get_by_role("link", name="Ver entregas").first.click()
    page.wait_for_url(re.compile(r"/tareas/"))
    page.wait_for_selector("tbody tr")
    check("S05 bandeja lista a los 5 estudiantes", page.locator("tbody tr").count() == 5)
    check("S05 muestra 'Sin entregar' para Elena", page.get_by_text("Sin entregar").count() >= 1)
    check("S05 marca la entrega tardía", page.get_by_text("Tarde", exact=True).count() >= 1)
    scores = [t.strip() for t in page.locator("tbody tr td:nth-child(4)").all_inner_texts()]
    page.screenshot(path=str(OUT / "S05.png"), full_page=True)

    # informe del primero (el de mayor similitud)
    page.locator("tbody tr").first.get_by_role("link", name="Ver informe").click()
    page.wait_for_url(re.compile(r"/informe"))
    page.wait_for_selector("mark")
    check("S09 hay coincidencias resaltadas", page.locator("mark").count() > 0)
    before = page.get_by_role("heading", name="Informe de similitud").locator("xpath=../..").inner_text()
    page.screenshot(path=str(OUT / "S09.png"), full_page=True)

    # excluir una fuente cambia la puntuación
    badge_before = page.locator("[aria-label^='Similitud']").first.get_attribute("aria-label")
    page.get_by_role("button", name=re.compile(r"^Excluir la fuente 1")).click()
    page.get_by_role("button", name=re.compile(r"^Incluir la fuente 1")).wait_for()
    badge_after = page.locator("[aria-label^='Similitud']").first.get_attribute("aria-label")
    check("excluir una fuente baja la puntuación", badge_before != badge_after, f"{badge_before} → {badge_after}")
    check("la fuente excluida queda marcada", page.get_by_text("excluida").count() >= 1)
    page.get_by_role("button", name=re.compile(r"^Incluir la fuente 1")).click()
    page.get_by_role("button", name=re.compile(r"^Excluir la fuente 1")).wait_for()

    # filtro con valor fuera de rango
    page.get_by_label("Ignorar coincidencias de menos de (palabras)").fill("500")
    page.get_by_role("button", name="Aplicar filtros").click()
    page.wait_for_timeout(300)
    invalid = page.get_by_label("Ignorar coincidencias de menos de (palabras)").evaluate("e => !e.checkValidity()")
    check("un filtro fuera de rango queda bloqueado por el formulario", invalid and "/informe" in page.url)

    # crear clase y tarea (S03, S06)
    page.goto(f"{BASE}/clases/nueva")
    page.get_by_role("button", name="Crear clase").click()
    page.wait_for_timeout(400)
    check("S03 el navegador exige el nombre", page.url.endswith("/clases/nueva"))
    page.get_by_label("Nombre de la clase").fill("ab")
    page.get_by_role("button", name="Crear clase").click()
    page.wait_for_selector(ALERT)
    check("S03 nombre demasiado corto muestra error y conserva lo escrito",
          page.get_by_label("Nombre de la clase").input_value() == "ab")
    page.screenshot(path=str(OUT / "S03.png"), full_page=True)
    page.get_by_label("Nombre de la clase").fill("Taller de Redacción con un nombre bastante largo para probar el ajuste de línea")
    page.get_by_role("button", name="Crear clase").click()
    page.wait_for_url(re.compile(r"/clases/c-"))
    check("S03 crea la clase y abre su página", page.get_by_text("Clave para unirse").count() == 1)
    class_url = page.url
    page.get_by_role("link", name="Crear tarea").first.click()
    page.get_by_label("Título de la tarea").fill("Primera tarea")
    page.screenshot(path=str(OUT / "S06.png"), full_page=True)
    page.get_by_role("button", name="Crear tarea").click()
    page.wait_for_url(re.compile(r"/tareas/a-"))
    try:
        page.wait_for_selector("text=Aún no hay estudiantes", timeout=5000)
        ok_s06 = True
    except Exception:
        ok_s06 = False
    check("S06 crea la tarea y abre la bandeja", ok_s06)
    logout(page)

    # ---- estudiante (Elena, sin entregas)
    login(page, "Elena Gil")
    page.goto(f"{BASE}/clases/c-comesc")
    page.screenshot(path=str(OUT / "S07.png"), full_page=True)
    page.get_by_role("link", name="Entregar").last.click()
    page.wait_for_url(re.compile(r"/tareas/a-resena"))

    page.get_by_role("button", name="Entregar trabajo").click()
    page.wait_for_timeout(400)
    check("S08 el navegador exige el título", re.search(r"/tareas/a-resena", page.url) is not None)
    page.get_by_label("Título del trabajo").fill("Reseña de prueba")
    page.get_by_role("button", name="Entregar trabajo").click()
    page.wait_for_selector(ALERT)
    check("S08 sin texto ni archivo muestra error", "No hay texto" in page.locator(ALERT).inner_text())

    FIX = Path(__file__).resolve().parent / "fixtures"
    page.get_by_label("Sube un archivo").set_input_files({"name": "trabajo.docx", "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "buffer": b"no soy un zip"})
    page.get_by_role("button", name="Entregar trabajo").click()
    page.wait_for_function("document.querySelector('[role=alert]:not(#__next-route-announcer__)')?.innerText.includes('.docx')")
    check("S08 un .docx falso se rechaza con un mensaje claro", "no es un .docx" in page.locator(ALERT).inner_text())
    page.get_by_label("Sube un archivo").set_input_files(str(FIX / "vacio.pdf"))
    page.get_by_role("button", name="Entregar trabajo").click()
    page.wait_for_function("document.querySelector('[role=alert]:not(#__next-route-announcer__)')?.innerText.includes('PDF')")
    check("S08 un PDF sin texto explica el motivo (OCR)", "OCR" in page.locator(ALERT).inner_text())
    check("S08 conserva el título tras el error", page.get_by_label("Título del trabajo").input_value() == "Reseña de prueba")
    page.screenshot(path=str(OUT / "S08.png"), full_page=True)

    page.get_by_label("Sube un archivo").set_input_files([])
    page.get_by_label("Texto del trabajo").fill("Muy corto")
    page.get_by_role("button", name="Entregar trabajo").click()
    page.wait_for_function("document.querySelector('[role=alert]:not(#__next-route-announcer__)')?.innerText.includes('demasiado corto')")
    check("S08 un texto demasiado corto se rechaza", "demasiado corto" in page.locator(ALERT).inner_text())

    pasted = ("Esta es mi reseña personal del artículo. " + DOC1 + " Para cerrar, creo que lo más útil es dividir el estudio en bloques pequeños y revisar cada uno con calma.")
    page.get_by_label("Texto del trabajo").fill(pasted)
    page.get_by_role("button", name="Entregar trabajo").click()
    page.wait_for_url(re.compile(r"/informe\?recibido=1"))
    page.get_by_text("Tu recibo es").wait_for()
    check("S08 entrega y abre el informe con el recibo", page.get_by_text("Tu recibo es").count() == 1)
    page.wait_for_selector("mark")
    check("S09 el estudiante ve coincidencias", page.locator("mark").count() > 0)
    check("S09 el estudiante no ve botones de exclusión", page.get_by_role("button", name=re.compile("Excluir")).count() == 0)
    page.screenshot(path=str(OUT / "S09-estudiante.png"), full_page=True)
    mine_url = page.url.split("?")[0]

    # reentrega = versión 2 con un .docx real; versión 3 con un .pdf real
    page.goto(f"{BASE}/tareas/a-resena")
    check("S08 lista la versión 1", page.get_by_text("Versión 1").count() == 1)
    page.get_by_label("Título del trabajo").fill("Reseña en Word")
    page.get_by_label("Sube un archivo").set_input_files(str(FIX / "resena.docx"))
    page.get_by_role("button", name="Entregar trabajo").click()
    page.wait_for_url(re.compile(r"/informe\?recibido=1"))
    page.wait_for_selector("mark")
    check("S08 un .docx real se extrae y genera coincidencias", page.locator("mark").count() > 0)
    page.goto(f"{BASE}/tareas/a-resena")
    page.get_by_label("Título del trabajo").fill("Reseña en PDF")
    page.get_by_label("Sube un archivo").set_input_files(str(FIX / "resena.pdf"))
    page.get_by_role("button", name="Entregar trabajo").click()
    page.wait_for_url(re.compile(r"/informe\?recibido=1"))
    page.wait_for_selector("mark")
    check("S08 un PDF real se extrae y genera coincidencias", page.locator("mark").count() > 0)
    mine_url = page.url.split("?")[0]
    logout(page)

    # permisos: Ana no puede abrir el informe de Elena
    login(page, "Ana Ruiz")
    resp = page.goto(mine_url)
    check("otro estudiante no puede abrir un informe ajeno", resp.status == 404 or page.get_by_text("No encontramos esta página").count() == 1)
    resp = page.goto(f"{BASE}/clases/nueva")
    check("un estudiante no entra en 'Crear clase'", page.url.endswith("/clases"))
    # S08 con plazo cerrado/tardío
    page.goto(f"{BASE}/tareas/a-ensayo")
    check("S08 plazo vencido con tardías avisa al estudiante", page.get_by_text("quedará marcado como tardío").count() == 1)
    page.screenshot(path=str(OUT / "S08-tardia.png"), full_page=True)
    # unirse con clave inválida y válida
    page.goto(f"{BASE}/clases")
    page.get_by_label("Clave de la clase").fill("NOEXISTE-1")
    page.get_by_role("button", name="Unirme").click()
    page.wait_for_selector(ALERT)
    check("S02 clave inválida muestra error", "No encontramos" in page.locator(ALERT).inner_text())
    page.get_by_label("Clave de la clase").fill("met-1170")
    page.get_by_role("button", name="Unirme").click()
    page.wait_for_url(re.compile(r"/clases/c-metod"))
    check("S02 unirse con clave (sin distinguir mayúsculas) abre la clase", page.get_by_text("Metodología II").count() >= 1)
    logout(page)

    # ---- cuentas reales
    fresh = browser.new_context(viewport={"width": 1280, "height": 800})
    a = fresh.new_page()
    a.goto(f"{BASE}/registro")
    a.get_by_label("Nombre").fill("Lucía Prueba")
    a.get_by_label("Correo electrónico").fill("lucia@example.com")
    a.get_by_label("Contraseña").fill("corta")
    a.get_by_role("button", name="Crear cuenta").click()
    a.wait_for_timeout(400)
    check("registro: el navegador exige 10 caracteres", a.url.endswith("/registro"))
    a.get_by_label("Contraseña").fill("clave-muy-larga-1")
    a.get_by_role("button", name="Crear cuenta").click()
    a.wait_for_url(re.compile(r"/clases$"))
    check("registro: crea la cuenta y entra", True)
    cookie = [c for c in fresh.cookies() if c["name"] == "ma_session"][0]
    check("la cookie de sesión es httpOnly", cookie["httpOnly"] is True and cookie["sameSite"] == "Lax")
    logout(a)
    a.get_by_label("Correo electrónico").fill("lucia@example.com")
    a.get_by_label("Contraseña").fill("mala-clave-123")
    a.get_by_role("button", name="Entrar", exact=True).click()
    a.wait_for_selector(ALERT)
    wrong = a.locator(ALERT).inner_text()
    check("login: contraseña incorrecta da un mensaje genérico", "incorrectos" in wrong)
    a.get_by_label("Correo electrónico").fill("nadie@example.com")
    a.get_by_label("Contraseña").fill("mala-clave-123")
    a.get_by_role("button", name="Entrar", exact=True).click()
    a.wait_for_timeout(900)  # el mensaje es idéntico al anterior: se espera a que el formulario termine y se reinicie
    check("login: cuenta inexistente da el mismo mensaje", a.locator(ALERT).inner_text() == wrong)
    a.get_by_label("Correo electrónico").fill("lucia@example.com")
    a.get_by_label("Contraseña").fill("clave-muy-larga-1")
    a.get_by_role("button", name="Entrar", exact=True).click()
    try:
        a.wait_for_url(re.compile(r"/clases$"), timeout=8000)
    except Exception:
        a.screenshot(path="/tmp/dbg.png"); print("URL", a.url, a.locator("body").inner_text()[:300]); raise
    check("login: con la contraseña correcta entra", True)
    # cookie manipulada
    fresh.add_cookies([{**cookie, "value": cookie["value"][:-3] + "abc"}])
    a.goto(f"{BASE}/clases")
    check("una cookie manipulada no da acceso", a.url.endswith("/entrar"))
    fresh.close()
    # límite de intentos
    lim = browser.new_context().new_page()
    lim.goto(f"{BASE}/entrar")
    msg = ""
    for _ in range(7):
        lim.get_by_label("Correo electrónico").fill("victima@example.com")
        lim.get_by_label("Contraseña").fill("intento-fallido-1")
        lim.get_by_role("button", name="Entrar", exact=True).click()
        lim.wait_for_timeout(500)
        msg = lim.locator(ALERT).inner_text() if lim.locator(ALERT).count() else ""
    check("login: tras varios fallos se bloquea temporalmente", "Demasiados intentos" in msg)

    # ---- móvil
    mobile = browser.new_context(viewport={"width": 390, "height": 800})
    m = mobile.new_page()
    m.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    m.goto(f"{BASE}/entrar")
    m.get_by_role("button", name="Entrar como Dra. Marta Vidal").click()
    m.wait_for_url(re.compile(r"/clases$"))
    for path in ["/clases", "/clases/c-comesc", "/tareas/a-ensayo", "/clases/nueva", "/clases/c-comesc/tareas/nueva"]:
        m.goto(f"{BASE}{path}")
        check(f"390 px sin desbordes en {path}", no_overflow(m))
    m.goto(f"{BASE}/tareas/a-ensayo")
    m.locator("tbody tr").first.get_by_role("link", name="Ver informe").click()
    m.wait_for_url(re.compile(r"/informe"))
    check("390 px sin desbordes en el informe", no_overflow(m))
    m.screenshot(path=str(OUT / "S09-390.png"), full_page=True)

    # teclado: el primer Tab llega a un elemento interactivo con foco visible
    m.goto(f"{BASE}/entrar")
    m.keyboard.press("Tab")
    focused = m.evaluate("document.activeElement && document.activeElement.tagName")
    check("teclado: el primer Tab llega a un botón", focused == "BUTTON", str(focused))

    browser.close()

check("sin errores en la consola", len(console_errors) == 0, "; ".join(console_errors[:3]))
failed = [n for n, ok in results if not ok]
print(f"\n{len(results)} comprobaciones, {len(failed)} fallos")
sys.exit(1 if failed else 0)

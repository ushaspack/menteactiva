#!/usr/bin/env python3
"""Corrección: comentarios, nota, publicación y vista del estudiante (S11, S14). Uso: python3 e2e/feedback.py [URL_BASE]"""
import re, sys, uuid
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3100"
OUT = Path(__file__).resolve().parents[2] / "clone-screens"
AXE = Path(__file__).resolve().parents[1] / "node_modules/axe-core/axe.min.js"
ALERT = "[role=alert]:not(#__next-route-announcer__)"
RUN = uuid.uuid4().hex[:6]
results, errors, bad = [], [], []


def check(case, name, ok, extra=""):
    results.append((case, ok))
    print(("OK    " if ok else "FALLA ") + f"{case} {name}" + (f"  [{extra}]" if extra else ""))


def page_for(b, w=1280):
    ctx = b.new_context(viewport={"width": w, "height": 900})
    p = ctx.new_page()
    p.on("console", lambda m: errors.append(m.text) if m.type == "error" and "status of 404" not in m.text else None)
    p.on("pageerror", lambda e: errors.append(str(e)))
    p.on("response", lambda r: bad.append(f"{r.status} {r.url}") if r.status >= 500 or (r.status == 404 and r.request.resource_type != "document") else None)
    return ctx, p


def demo(b, label):
    ctx, p = page_for(b)
    p.goto(f"{BASE}/entrar")
    p.get_by_role("button", name=label).click()
    p.wait_for_url(re.compile(r"/clases$"))
    return ctx, p


def select_text(p, phrase):
    ok = p.evaluate("""(phrase) => {
      const box = document.querySelector('[data-text-root]');
      const idx = box.textContent.indexOf(phrase);
      if (idx < 0) return false;
      const locate = (pos) => {
        const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
        let n, acc = 0;
        while ((n = w.nextNode())) {
          const len = n.textContent.length;
          if (pos <= acc + len) return [n, pos - acc];
          acc += len;
        }
      };
      const [sn, so] = locate(idx), [en, eo] = locate(idx + phrase.length);
      const r = document.createRange(); r.setStart(sn, so); r.setEnd(en, eo);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r); return true;
    }""", phrase)
    assert ok, phrase
    p.get_by_role("form", name="Añadir comentario").wait_for()


def row_href(p, student, suffix):
    row = p.locator("tbody tr", has_text=student)
    return row.get_by_role("link", name=suffix).get_attribute("href")


P1 = "cada persona debe encontrar su propio ritmo"
P2 = "propio ritmo y probar métodos"
P3 = "Los estudios sobre hábitos de aprendizaje"

with sync_playwright() as pw:
    b = pw.chromium.launch()
    tctx, t = demo(b, "Entrar como Dra. Marta Vidal")
    t.goto(f"{BASE}/tareas/a-ensayo")
    check("F10-H1", "la bandeja tiene columna Nota y botón Corregir", t.get_by_role("columnheader", name="Nota").count() == 1 and t.get_by_role("link", name="Corregir").count() >= 4)
    check("F10-H2", "la nota publicada de Ana aparece con su etiqueta", t.locator("tbody tr", has_text="Ana Ruiz").get_by_text("82 / 100").count() == 1 and t.locator("tbody tr", has_text="Ana Ruiz").get_by_text("Publicada").count() == 1)
    beto = row_href(t, "Beto Soler", "Corregir")
    carla = row_href(t, "Carla Vidal", "Corregir")
    ana = row_href(t, "Ana Ruiz", "Corregir")
    beto_id = beto.split("/")[2]
    ana_id = ana.split("/")[2]

    # ---- S11
    t.goto(f"{BASE}{beto}")
    check("F10-H3", "S11 muestra el texto del trabajo y el estado vacío de comentarios", t.get_by_text("Todavía no hay comentarios").count() == 1 and t.get_by_text("Para terminar").count() == 1)
    t.screenshot(path=str(OUT / "S11-vacio.png"), full_page=True)

    select_text(t, P1)
    t.get_by_label("Tu comentario").fill("Muy buena idea final 😀 pero desarróllala con un ejemplo.")
    t.get_by_role("button", name="Añadir comentario").click()
    t.wait_for_selector("mark[data-n='1']")
    check("F10-H4", "un comentario sobre la selección marca el fragmento con el número 1", t.locator("mark[data-n='1']").inner_text().strip() == P1)
    check("F10-H5", "el comentario aparece en la lista lateral", t.get_by_text("Muy buena idea final 😀").count() == 1)

    t.wait_for_timeout(300)
    select_text(t, P2)
    t.get_by_label("Tu comentario").fill("solapado")
    t.get_by_role("button", name="Añadir comentario").click()
    t.wait_for_selector(ALERT)
    check("F10-N1", "comentar un tramo solapado se rechaza con mensaje", "solapa" in t.locator(ALERT).inner_text())
    check("F10-N2", "el comentario sigue escrito tras el error", t.get_by_label("Tu comentario").input_value() == "solapado")
    t.get_by_role("button", name="Cancelar").click()

    select_text(t, P3)
    t.get_by_label("Tu comentario").fill("   ")
    t.get_by_role("button", name="Añadir comentario").click()
    t.wait_for_selector(ALERT)
    check("F10-N3", "un comentario de solo espacios se rechaza", "Escribe el comentario" in t.locator(ALERT).inner_text())
    t.get_by_label("Tu comentario").fill("L" * 2000)
    t.get_by_role("button", name="Añadir comentario").click()
    t.wait_for_selector("mark[data-n='2']")
    check("F10-E1", "comentario de 2000 caracteres aceptado (queda el número 2)", t.locator("mark[data-n]").count() == 2)
    check("F10-E2", "comentario largo sin desbordes a 1280", not t.evaluate("document.documentElement.scrollWidth > innerWidth"))

    # ---- nota
    t.get_by_label("Nota (de 0 a 100)").fill("150")
    t.get_by_role("button", name="Guardar nota").click()
    t.wait_for_selector(ALERT)
    check("F10-N4", "una nota mayor que el máximo se rechaza", "entre 0 y 100" in t.locator(ALERT).inner_text())
    t.get_by_label("Nota (de 0 a 100)").fill("abc")
    t.get_by_role("button", name="Guardar nota").click()
    t.wait_for_function("document.querySelector('[role=alert]:not(#__next-route-announcer__)')?.innerText.includes('número')")
    check("F10-N5", "una nota que no es número se rechaza", True)
    t.get_by_label("Nota (de 0 a 100)").fill("76,5")
    t.get_by_label("Comentario general").fill("Ensayo correcto, con margen de mejora en las fuentes.")
    t.get_by_role("button", name="Guardar nota").click()
    t.get_by_text("Guardado.").wait_for()
    check("F10-H6", "76,5 con coma decimal se guarda", True)
    t.reload()
    check("F10-H7", "la nota y el comentario general persisten al recargar", t.get_by_label("Nota (de 0 a 100)").input_value() == "76.5" and "margen de mejora" in t.get_by_label("Comentario general").input_value())

    # ---- no publicado: el estudiante no ve nada
    t.goto(f"{BASE}/tareas/a-ensayo")
    check("F10-H8", "la bandeja marca «Sin publicar»", t.locator("tbody tr", has_text="Beto Soler").get_by_text("Sin publicar").count() == 1)
    bctx, s = demo(b, "Beto Soler")
    s.goto(f"{BASE}/entregas/{beto_id}/resultado")
    check("F10-N6", "antes de publicar el estudiante ve el estado vacío y ninguna nota", s.get_by_text("aún no ha publicado").count() == 1 and s.get_by_text("76").count() == 0 and s.get_by_text("Muy buena idea").count() == 0)
    s.screenshot(path=str(OUT / "S14-sin-publicar.png"), full_page=True)
    s.goto(f"{BASE}/tareas/a-ensayo")
    check("F10-N7", "la tarea del estudiante no ofrece «Ver nota» sin publicar", s.get_by_role("link", name="Ver nota y comentarios").count() == 0)
    s.goto(f"{BASE}/entregas/{beto_id}/feedback")
    check("F10-N8", "el estudiante no abre la pantalla de corregir", s.get_by_text("No encontramos esta página").count() == 1)

    # ---- publicar
    t.goto(f"{BASE}{carla}")
    t.get_by_role("button", name="Publicar corrección").click()
    t.wait_for_selector(ALERT)
    check("F10-N9", "publicar sin nota ni comentarios se rechaza", "Pon una nota" in t.locator(ALERT).inner_text())
    t.goto(f"{BASE}{beto}")
    t.get_by_role("button", name="Publicar corrección").click()
    t.get_by_role("button", name="Retirar publicación").wait_for()
    check("F10-H9", "publicar cambia el botón a «Retirar publicación»", True)

    s.goto(f"{BASE}/tareas/a-ensayo")
    s.get_by_role("link", name="Ver nota y comentarios").click()
    s.wait_for_url(re.compile(r"/resultado"))
    s.wait_for_selector("mark[data-n='1']")
    check("F10-H10", "el estudiante ve su nota 76,5 / 100", s.get_by_text("76,5").count() >= 1 and s.get_by_text("/ 100").count() >= 1)
    check("F10-H11", "el estudiante ve el comentario general y los dos comentarios del texto", s.get_by_text("margen de mejora").count() == 1 and s.locator("mark[data-n]").count() == 2)
    check("F10-H12", "el estudiante no tiene formulario para comentar", s.get_by_label("Tu comentario").count() == 0 and s.get_by_role("button", name="Eliminar").count() == 0)
    s.screenshot(path=str(OUT / "S14.png"), full_page=True)
    res_url = s.url

    # otro estudiante
    actx, a = demo(b, "Ana Ruiz")
    a.goto(res_url)
    check("F10-N10", "otro estudiante no abre el resultado ajeno", a.get_by_text("No encontramos esta página").count() == 1)
    a.goto(f"{BASE}/entregas/{ana_id}/resultado")
    check("F10-H13", "Ana ve su nota de ejemplo 82 y su comentario", a.get_by_text("82").count() >= 1 and a.locator("mark[data-n='1']").count() == 1)
    ac = a.locator("mark[data-n='1']")
    check("F10-H14", "el fragmento de Ana coincide con la frase comentada", "pausas breves" in ac.inner_text())

    # docente ajeno
    xctx, x = page_for(b)
    x.goto(f"{BASE}/registro")
    x.get_by_label("Nombre").fill("Docente Tres")
    x.get_by_label("Correo electrónico").fill(f"docentetres-{RUN}@example.com")
    x.get_by_label("Soy").select_option("docente")
    x.get_by_label("Contraseña").fill("clave-segura-123")
    x.get_by_role("button", name="Crear cuenta").click()
    x.wait_for_url(re.compile(r"/clases$"))
    x.goto(f"{BASE}/entregas/{beto_id}/feedback")
    check("F10-N11", "docente ajeno no abre la corrección", x.get_by_text("No encontramos esta página").count() == 1 and x.get_by_text("Para terminar").count() == 0)
    xctx.close()

    # retirar publicación y borrar comentario
    t.get_by_role("button", name="Retirar publicación").click()
    t.get_by_role("button", name="Publicar corrección").wait_for()
    s.reload()
    check("F10-H15", "al retirar la publicación el estudiante deja de ver la nota", s.get_by_text("aún no ha publicado").count() == 1)
    t.get_by_role("button", name="Eliminar el comentario 1").click()
    t.wait_for_function("document.querySelectorAll('mark[data-n]').length === 1")
    check("F10-H16", "eliminar un comentario lo quita del texto y renumera", t.locator("mark[data-n='1']").count() == 1)

    # ---- accesibilidad y móvil
    axe = AXE.read_text()
    for name, pg, url in [("S11", t, f"{BASE}{beto}"), ("S14 vacía", s, res_url), ("S14 Ana", a, f"{BASE}/entregas/{ana_id}/resultado"), ("bandeja", t, f"{BASE}/tareas/a-ensayo")]:
        pg.goto(url)
        pg.add_script_tag(content=axe)
        v = pg.evaluate("axe.run(document, {runOnly:['wcag2a','wcag2aa','wcag21aa']}).then(r => r.violations.map(v => v.id + ' x' + v.nodes.length))")
        check("A11Y", f"axe sin violaciones en {name}", not v, ", ".join(v))
    t.goto(f"{BASE}{beto}")
    t.screenshot(path=str(OUT / "S11.png"), full_page=True)

    mctx, m = page_for(b, 390)
    m.goto(f"{BASE}/entrar")
    m.get_by_role("button", name="Entrar como Dra. Marta Vidal").click()
    m.wait_for_url(re.compile(r"/clases$"))
    m.goto(f"{BASE}{beto}")
    check("MOV", "S11 a 390 px sin desbordes", not m.evaluate("document.documentElement.scrollWidth > innerWidth"))
    m.screenshot(path=str(OUT / "S11-390.png"), full_page=True)
    mctx2, m2 = page_for(b, 390)
    m2.goto(f"{BASE}/entrar")
    m2.get_by_role("button", name="Ana Ruiz").click()
    m2.wait_for_url(re.compile(r"/clases$"))
    m2.goto(f"{BASE}/entregas/{ana_id}/resultado")
    check("MOV", "S14 a 390 px sin desbordes", not m2.evaluate("document.documentElement.scrollWidth > innerWidth"))
    m2.screenshot(path=str(OUT / "S14-390.png"), full_page=True)
    b.close()

check("GLOBAL", "sin errores de consola", not errors, "; ".join(errors[:3]))
check("GLOBAL", "sin 5xx ni recursos 404", not bad, "; ".join(bad[:3]))
failed = [c for c, ok in results if not ok]
print(f"\n{len(results)} casos, {len(failed)} fallos")
sys.exit(1 if failed else 0)

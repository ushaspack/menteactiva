import { test } from "node:test";
import assert from "node:assert/strict";
import { compare, countWords, tokenize, fingerprints } from "./similarity.ts";
import type { CorpusDoc, ReportSettings } from "./types.ts";

const base: ReportSettings = { excludeQuotes: false, excludeBibliography: false, excludeBelowWords: 0, excludedSourceIds: [] };

const original =
  "La memoria de trabajo permite mantener y manipular información durante breves periodos de tiempo. " +
  "Los modelos más influyentes dividen este sistema en componentes especializados que cooperan con la atención. " +
  "La capacidad no es fija y varía con el entrenamiento sostenido a lo largo de las semanas.";

const doc = (id: string, text: string): CorpusDoc => ({
  id, scope: "institution", submissionId: null, kind: "student_paper", title: `Doc ${id}`, url: null, text,
});

test("tokeniza con tildes y eñes", () => {
  const t = tokenize("Mañana, ñandú; ¿qué?");
  assert.deepEqual(t.map((x) => x.norm), ["manana", "nandu", "que"]);
});

test("las huellas son deterministas", () => {
  const a = [...fingerprints(tokenize(original)).keys()];
  const b = [...fingerprints(tokenize(original)).keys()];
  assert.deepEqual(a, b);
  assert.ok(a.length > 0);
});

test("texto idéntico da casi 100 %", () => {
  const r = compare(original, [doc("a", original)], base);
  assert.ok(r.score > 90, `puntuación ${r.score}`);
  assert.equal(r.sources.length, 1);
});

test("texto sin relación da 0 %", () => {
  const r = compare(original, [doc("a", "El tren llegó puntual a la estación del norte y los viajeros bajaron con calma por las escaleras.")], base);
  assert.equal(r.score, 0);
  assert.equal(r.sources.length, 0);
});

test("una frase copiada se detecta como tramo", () => {
  const mine = "Introducción propia sobre el tema. Los modelos más influyentes dividen este sistema en componentes especializados que cooperan con la atención. Cierre propio muy distinto.";
  const r = compare(mine, [doc("a", original)], base);
  assert.ok(r.score > 30 && r.score < 90, `puntuación ${r.score}`);
  assert.equal(r.matches.length, 1);
  const seg = mine.slice(r.matches[0].startChar, r.matches[0].endChar);
  assert.ok(seg.startsWith("Los modelos"));
  assert.ok(seg.endsWith("atención"));
});

test("excluir una fuente baja la puntuación a 0", () => {
  const r = compare(original, [doc("a", original)], { ...base, excludedSourceIds: ["a"] });
  assert.equal(r.score, 0);
  assert.equal(r.matches.length, 0);
  assert.equal(r.sources[0].excluded, true);
});

test("excluir citas textuales quita el tramo entrecomillado", () => {
  const quoted = `Texto previo distinto del resto. "Los modelos más influyentes dividen este sistema en componentes especializados que cooperan con la atención" y cierre propio.`;
  const withQuotes = compare(quoted, [doc("a", original)], base);
  const without = compare(quoted, [doc("a", original)], { ...base, excludeQuotes: true });
  assert.ok(withQuotes.score > 0);
  assert.equal(without.score, 0);
});

test("excluir bibliografía descarta lo que va tras el encabezado", () => {
  const text = `Mi análisis propio es muy diferente del resto de textos conocidos.\nBibliografía\n${original}`;
  const a = compare(text, [doc("a", original)], base);
  const b = compare(text, [doc("a", original)], { ...base, excludeBibliography: true });
  assert.ok(a.score > 0);
  assert.equal(b.score, 0);
});

test("el mínimo de palabras descarta coincidencias cortas", () => {
  const mine = "Frase propia número uno. los modelos más influyentes dividen este sistema. Otra frase propia distinta.";
  const a = compare(mine, [doc("a", original)], base);
  const b = compare(mine, [doc("a", original)], { ...base, excludeBelowWords: 30 });
  assert.ok(a.score >= 0);
  assert.equal(b.score, 0);
});

test("dos fuentes iguales no suman por encima de 100", () => {
  const r = compare(original, [doc("a", original), doc("b", original)], base);
  assert.ok(r.score <= 100);
  assert.equal(r.sources.length, 1); // el segundo documento no aporta tokens nuevos
});

test("cuenta palabras", () => {
  assert.equal(countWords("uno dos tres"), 3);
});

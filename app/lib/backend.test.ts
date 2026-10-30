import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPassword, makeToken, readToken, recordFailure, revokeSessions, setPassword, tooManyAttempts, validatePassword } from "./auth";
import { extractFromFile } from "./extract";

test("contraseña: correcta, incorrecta y cuenta inexistente", async () => {
  await setPassword("u-x", "una-clave-larga-1");
  assert.equal(await checkPassword("u-x", "una-clave-larga-1"), true);
  assert.equal(await checkPassword("u-x", "otra-clave-larga"), false);
  assert.equal(await checkPassword(null, "una-clave-larga-1"), false);
});

test("validatePassword rechaza cortas y repetitivas", () => {
  assert.ok(validatePassword("corta"));
  assert.ok(validatePassword("aaaaaaaaaaaa"));
  assert.equal(validatePassword("una-clave-larga-1"), null);
});

test("token: válido, manipulado y revocado", async () => {
  await setPassword("u-y", "una-clave-larga-1");
  const t = makeToken("u-y");
  assert.equal(readToken(t), "u-y");
  assert.equal(readToken(t.replace("u-y", "u-z")), null);
  assert.equal(readToken(t.slice(0, -2) + "xx"), null);
  assert.equal(readToken(undefined), null);
  revokeSessions("u-y");
  assert.equal(readToken(t), null);
});

test("límite de intentos tras 5 fallos", () => {
  for (let i = 0; i < 5; i++) recordFailure("a@b.es");
  assert.equal(tooManyAttempts("a@b.es"), true);
  assert.equal(tooManyAttempts("otro@b.es"), false);
});

test("extracción: txt, binario falso y extensión no admitida", async () => {
  const txt = await extractFromFile("a.txt", new TextEncoder().encode("hola mundo"));
  assert.deepEqual(txt, { ok: true, text: "hola mundo" });
  const fake = await extractFromFile("a.docx", new TextEncoder().encode("no soy un zip"));
  assert.equal(fake.ok, false);
  const fakePdf = await extractFromFile("a.pdf", new TextEncoder().encode("no soy pdf"));
  assert.equal(fakePdf.ok, false);
  const exe = await extractFromFile("a.exe", new Uint8Array([1, 2, 3]));
  assert.equal(exe.ok, false);
});

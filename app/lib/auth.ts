// Autenticación real: contraseñas con scrypt, cookie de sesión firmada (HMAC), cierre de sesión global
// y límite de intentos. Las credenciales viven aparte del perfil para que nunca lleguen a una pantalla.
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { dataDir, loadSnapshot, register } from "./persist";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

interface Cred { hash: string; salt: string; version: number }
interface AuthState { creds: Map<string, Cred>; attempts: Map<string, number[]>; secret: string }

const g = globalThis as unknown as { __menteactivaAuth?: AuthState };
function state(): AuthState {
  if (!g.__menteactivaAuth) {
    let secret = process.env.SESSION_SECRET ?? "";
    // modo local: la clave de sesión se crea una vez y se guarda, para que no se cierre la sesión al reiniciar
    if (secret.length < 32 && dataDir()) {
      const f = path.join(dataDir(), "session.key");
      try { secret = fs.readFileSync(f, "utf8").trim(); } catch {
        secret = randomBytes(32).toString("hex");
        fs.mkdirSync(dataDir(), { recursive: true });
        fs.writeFileSync(f, secret, { mode: 0o600 });
      }
    }
    if (secret.length < 32 && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
      throw new Error("Falta SESSION_SECRET (mínimo 32 caracteres).");
    }
    g.__menteactivaAuth = { creds: new Map(), attempts: new Map(), secret: secret.length >= 32 ? secret : randomBytes(32).toString("hex") };
    const saved = loadSnapshot("auth") as [string, Cred][] | undefined;
    if (saved) g.__menteactivaAuth.creds = new Map(saved);
    register("auth", () => [...g.__menteactivaAuth!.creds]);
  }
  return g.__menteactivaAuth;
}

export const MIN_PASSWORD = 10;
export const SESSION_SECONDS = 60 * 60 * 24 * 14;

export function validatePassword(pw: string): string | null {
  if (pw.length < MIN_PASSWORD) return `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`;
  if (pw.length > 200) return "La contraseña es demasiado larga.";
  if (/^(.)\1+$/.test(pw)) return "Elige una contraseña menos repetitiva.";
  return null;
}

export async function setPassword(userId: string, password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  const prev = state().creds.get(userId);
  state().creds.set(userId, { hash: hash.toString("hex"), salt: salt.toString("hex"), version: (prev?.version ?? 0) + 1 });
}

export async function checkPassword(userId: string | null, password: string): Promise<boolean> {
  const c = userId ? state().creds.get(userId) : undefined;
  // siempre se calcula un hash, exista o no la cuenta, para no revelar qué correos están registrados
  const salt = c ? Buffer.from(c.salt, "hex") : Buffer.alloc(16);
  const got = await scrypt(password, salt, 64);
  if (!c) return false;
  const want = Buffer.from(c.hash, "hex");
  return want.length === got.length && timingSafeEqual(want, got);
}

export function revokeSessions(userId: string) {
  const c = state().creds.get(userId);
  if (c) c.version += 1;
}

const sign = (payload: string) => createHmac("sha256", state().secret).update(payload).digest("base64url");

export function makeToken(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const v = state().creds.get(userId)?.version ?? 0;
  const payload = `${userId}.${exp}.${v}`;
  return `${payload}.${sign(payload)}`;
}

export function readToken(token: string | undefined): string | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const given = Buffer.from(token.slice(i + 1));
  const want = Buffer.from(sign(payload));
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;
  const [userId, exp, v] = payload.split(".");
  if (!userId || Number(exp) < Date.now() / 1000) return null;
  if ((state().creds.get(userId)?.version ?? 0) !== Number(v)) return null;
  return userId;
}

// 5 fallos cada 10 minutos por clave (correo)
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS = 5;
export function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const list = (state().attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  state().attempts.set(key, list);
  return list.length >= MAX_FAILS;
}
export function recordFailure(key: string) {
  const list = state().attempts.get(key) ?? [];
  list.push(Date.now());
  state().attempts.set(key, list);
}
export function clearFailures(key: string) {
  state().attempts.delete(key);
}

// Sesión por cookie firmada (ver lib/auth.ts).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { makeToken, readToken } from "./auth";
import { findUser } from "./data";
import type { User } from "./types";

const COOKIE = "ma_session";

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  return findUser(readToken(jar.get(COOKIE)?.value));
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/entrar");
  return user;
}

export async function requireTeacher(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "docente") redirect("/clases");
  return user;
}

export async function signIn(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, makeToken(userId), {
    httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 14,
  });
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

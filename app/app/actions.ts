"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  addComment, createAssignment, createClass, deleteComment, saveGrade, setReleased, createSubmission, findUser, findUserByEmail, joinClass, registerUser, toggleSourceExcluded, updateReportSettings,
} from "@/lib/data";
import {
  checkPassword, clearFailures, recordFailure, revokeSessions, setPassword, tooManyAttempts, validatePassword,
} from "@/lib/auth";
import { extractFromFile } from "@/lib/extract";
import { madridLocalToIso } from "@/lib/format";
import { markDirty } from "@/lib/persist";
import { requireUser, signIn, signOut } from "@/lib/session";
import type { FormState } from "@/lib/form-state";
import type { Retention } from "@/lib/types";

const str = (f: FormData, k: string) => (typeof f.get(k) === "string" ? (f.get(k) as string) : "");
const flag = (f: FormData, k: string) => f.get(k) === "on";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

const DEMO = process.env.DEMO_MODE !== "0";

// Acceso de demostración con las personas de ejemplo. Se desactiva con DEMO_MODE=0.
export async function demoLoginAction(formData: FormData) {
  if (!DEMO) redirect("/entrar");
  const user = findUser(str(formData, "userId"));
  if (!user) redirect("/entrar");
  await signIn(user.id);
  redirect("/clases");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  markDirty();
  const email = str(formData, "email").trim().toLowerCase();
  const values = { email };
  const generic = "Correo o contraseña incorrectos.";
  if (tooManyAttempts(email)) return { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.", values };
  const user = findUserByEmail(email);
  const ok = await checkPassword(user?.id ?? null, str(formData, "password"));
  if (!user || !ok) {
    recordFailure(email);
    return { error: generic, values };
  }
  clearFailures(email);
  await signIn(user.id);
  redirect("/clases");
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  markDirty();
  const values = { name: str(formData, "name"), email: str(formData, "email"), role: str(formData, "role") };
  const key = `registro:${values.email.trim().toLowerCase()}`;
  if (tooManyAttempts(key)) return { error: "Demasiados intentos. Espera unos minutos.", values };
  recordFailure(key);
  const password = str(formData, "password");
  const bad = validatePassword(password);
  if (bad) return { error: bad, values };
  const r = registerUser({ name: values.name, email: values.email, role: values.role as "docente" | "estudiante" });
  if (!r.ok) return { error: r.error, values };
  await setPassword(r.value.id, password);
  await signIn(r.value.id);
  redirect("/clases");
}

export async function signOutEverywhereAction() {
  markDirty();
  const user = await requireUser();
  revokeSessions(user.id);
  await signOut();
  redirect("/entrar");
}

export async function logoutAction() {
  markDirty();
  await signOut();
  redirect("/entrar");
}

export async function createClassAction(_prev: FormState, formData: FormData): Promise<FormState> {
  markDirty();
  const user = await requireUser();
  const values = { title: str(formData, "title"), expires: str(formData, "expires") };
  const r = createClass(user, { title: values.title, expiresAt: values.expires ? madridLocalToIso(`${values.expires}T23:59`) : null });
  if (!r.ok) return { error: r.error, values };
  revalidatePath("/clases");
  redirect(`/clases/${r.value.id}`);
}

export async function joinClassAction(_prev: FormState, formData: FormData): Promise<FormState> {
  markDirty();
  const user = await requireUser();
  const values = { key: str(formData, "key") };
  // las claves tienen poco margen: se limita adivinar (5 fallos cada 10 minutos por persona)
  const limitKey = `unirse:${user.id}`;
  if (tooManyAttempts(limitKey)) return { error: "Demasiados intentos con claves que no existen. Espera unos minutos.", values };
  const r = joinClass(user, values.key);
  if (!r.ok) {
    recordFailure(limitKey);
    return { error: r.error, values };
  }
  revalidatePath("/clases");
  redirect(`/clases/${r.value.id}`);
}

export async function createAssignmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  markDirty();
  const user = await requireUser();
  const classId = str(formData, "classId");
  const values = {
    title: str(formData, "title"), instructions: str(formData, "instructions"), due: str(formData, "due"),
    retention: str(formData, "retention"), minWords: str(formData, "minWords"), maxPoints: str(formData, "maxPoints"),
  };
  const retention = (["institution", "platform", "none"] as const).find((x) => x === values.retention) as Retention | undefined;
  if (!retention) return { error: "Elige una opción de retención válida.", values };
  const due = values.due ? madridLocalToIso(values.due) : null;
  if (values.due && !due) return { error: "La fecha límite no es válida.", values };
  const r = createAssignment(user, classId, {
    title: values.title, instructions: values.instructions, dueAt: due,
    lateAllowed: flag(formData, "lateAllowed"), retention, studentsSeeReport: flag(formData, "studentsSeeReport"),
    excludeQuotes: flag(formData, "excludeQuotes"), excludeBibliography: flag(formData, "excludeBibliography"),
    excludeBelowWords: values.minWords === "" ? 0 : Number(values.minWords),
    maxPoints: values.maxPoints === "" ? 100 : Number(values.maxPoints),
  });
  if (!r.ok) return { error: r.error, values };
  revalidatePath(`/clases/${classId}`);
  redirect(`/tareas/${r.value.id}`);
}

export async function submitWorkAction(_prev: FormState, formData: FormData): Promise<FormState> {
  markDirty();
  const user = await requireUser();
  const assignmentId = str(formData, "assignmentId");
  const values = { title: str(formData, "title"), pasted: str(formData, "pasted") };

  let text = values.pasted;
  let fileName: string | null = null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) return { error: "El archivo pesa más de 50 MB.", values };
    const ex = await extractFromFile(file.name, new Uint8Array(await file.arrayBuffer()));
    if (!ex.ok) return { error: ex.error, values };
    text = ex.text;
    fileName = file.name;
  }

  const r = createSubmission(user, assignmentId, { title: values.title, text, fileName });
  if (!r.ok) return { error: r.error, values };
  revalidatePath(`/tareas/${assignmentId}`);
  redirect(`/entregas/${r.value.id}/informe?recibido=1`);
}

export async function updateExclusionsAction(formData: FormData) {
  markDirty();
  const user = await requireUser();
  const id = str(formData, "submissionId");
  const raw = str(formData, "minWords");
  const r = updateReportSettings(user, id, {
    excludeQuotes: flag(formData, "excludeQuotes"),
    excludeBibliography: flag(formData, "excludeBibliography"),
    excludeBelowWords: raw === "" ? 0 : Number(raw),
  });
  if (!r.ok) redirect(`/entregas/${id}/informe?error=${encodeURIComponent(r.error)}`);
  revalidatePath(`/entregas/${id}/informe`);
  redirect(`/entregas/${id}/informe`);
}

export async function toggleSourceAction(formData: FormData) {
  markDirty();
  const user = await requireUser();
  const id = str(formData, "submissionId");
  const r = toggleSourceExcluded(user, id, str(formData, "sourceId"));
  if (!r.ok) redirect(`/entregas/${id}/informe?error=${encodeURIComponent(r.error)}`);
  revalidatePath(`/entregas/${id}/informe`);
  redirect(`/entregas/${id}/informe`);
}

// ---- corrección (S11) ---------------------------------------------------------------------------

export async function saveGradeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  markDirty();
  const user = await requireUser();
  const id = str(formData, "submissionId");
  const values = { grade: str(formData, "grade"), overall: str(formData, "overall") };
  const r = saveGrade(user, id, values);
  if (!r.ok) return { error: r.error, values };
  revalidatePath(`/entregas/${id}/feedback`);
  return { error: null, ok: "Guardado.", values };
}

export async function addCommentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  markDirty();
  const user = await requireUser();
  const id = str(formData, "submissionId");
  const values = { text: str(formData, "text"), start: str(formData, "start"), end: str(formData, "end") };
  const r = addComment(user, id, { start: Number(values.start), end: Number(values.end), text: values.text });
  if (!r.ok) return { error: r.error, values };
  revalidatePath(`/entregas/${id}/feedback`);
  return { error: null, ok: "Comentario añadido.", values: {} };
}

export async function deleteCommentAction(formData: FormData) {
  markDirty();
  const user = await requireUser();
  const id = str(formData, "submissionId");
  deleteComment(user, id, str(formData, "commentId"));
  revalidatePath(`/entregas/${id}/feedback`);
}

export async function releaseAction(formData: FormData) {
  markDirty();
  const user = await requireUser();
  const id = str(formData, "submissionId");
  const r = setReleased(user, id, formData.get("release") === "1");
  revalidatePath(`/entregas/${id}/feedback`);
  if (!r.ok) redirect(`/entregas/${id}/feedback?error=${encodeURIComponent(r.error)}`);
  redirect(`/entregas/${id}/feedback`);
}

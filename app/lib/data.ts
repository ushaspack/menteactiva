// Capa de datos simulada. Las pantallas solo importan de aquí.
// Los permisos se comprueban en cada función (en la versión real los refuerza RLS en Postgres).

import { compare, countWords } from "./similarity";
import { DOC1, DOC2, DOC3, SEED_TEXTS, store, uid } from "./store";
import type {
  Assignment, ClassRoom, CorpusDoc, Feedback, FeedbackComment, Report, ReportSettings, Retention, Role, Submission, User,
} from "./types";

export type Result<T = undefined> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export const MAX_TEXT_CHARS = 400_000;

// ---- inicialización con datos de ejemplo -------------------------------------------------------

function ensureSeed() {
  const s = store();
  if (s.seeded) return;
  s.seeded = true;
  // sin datos de ejemplo cuando se desactiva el modo demostración (app de escritorio)
  if (process.env.DEMO_MODE === "0") return;

  const teacher: User = { id: "u-marta", name: "Dra. Marta Vidal", email: "marta.vidal@uni.example", role: "docente" };
  const students: User[] = [
    { id: "u-ana", name: "Ana Ruiz", email: "ana.ruiz@uni.example", role: "estudiante" },
    { id: "u-beto", name: "Beto Soler", email: "beto.soler@uni.example", role: "estudiante" },
    { id: "u-carla", name: "Carla Vidal", email: "carla.vidal@uni.example", role: "estudiante" },
    { id: "u-david", name: "David Pons", email: "david.pons@uni.example", role: "estudiante" },
    { id: "u-elena", name: "Elena Gil", email: "elena.gil@uni.example", role: "estudiante" },
  ];
  s.users.push(teacher, ...students);

  const cls: ClassRoom = {
    id: "c-comesc", ownerId: teacher.id, title: "Comunicación Escrita", enrollmentKey: "COM-4821",
    expiresAt: "2027-01-20T22:59:00.000Z", studentIds: students.map((u) => u.id), createdAt: "2026-09-10T08:00:00.000Z",
  };
  const cls2: ClassRoom = {
    id: "c-metod", ownerId: teacher.id, title: "Metodología II", enrollmentKey: "MET-1170",
    expiresAt: "2027-02-12T22:59:00.000Z", studentIds: [], createdAt: "2026-09-12T08:00:00.000Z",
  };
  s.classes.push(cls, cls2);

  const final: Assignment = {
    id: "a-ensayo", classId: cls.id, title: "Ensayo final", instructions: "Entre 300 y 600 palabras. Cita tus fuentes.",
    dueAt: "2026-10-29T22:59:00.000Z", lateAllowed: true, retention: "institution", studentsSeeReport: true,
    excludeQuotes: false, excludeBibliography: false, excludeBelowWords: 0, maxPoints: 100, createdAt: "2026-10-01T08:00:00.000Z",
  };
  const resena: Assignment = {
    id: "a-resena", classId: cls.id, title: "Reseña breve", instructions: "Una página. Comenta un artículo de la bibliografía.",
    dueAt: "2026-11-13T22:59:00.000Z", lateAllowed: false, retention: "institution", studentsSeeReport: true,
    excludeQuotes: true, excludeBibliography: true, excludeBelowWords: 0, maxPoints: 10, createdAt: "2026-10-20T08:00:00.000Z",
  };
  s.assignments.push(final, resena);

  const external: CorpusDoc[] = [
    { id: "d-inst1", scope: "institution", submissionId: null, kind: "student_paper", title: "Trabajo de la institución", url: null, text: DOC1 },
    { id: "d-pub1", scope: "institution", submissionId: null, kind: "publication", title: "Publicación académica", url: null, text: DOC2 },
    { id: "d-web1", scope: "institution", submissionId: null, kind: "web", title: "Sitio web de hábitos de estudio", url: "https://example.org/habitos-de-estudio", text: DOC3 },
  ];
  s.corpus.push(...external);

  const seeds: Array<[string, string, string, string]> = [
    ["u-ana", "La memoria de trabajo", SEED_TEXTS.ana, "2026-10-28T20:14:00.000Z"],
    ["u-david", "Fuentes y citas", SEED_TEXTS.david, "2026-10-28T18:03:00.000Z"],
    ["u-carla", "Atención y entrenamiento", SEED_TEXTS.carla, "2026-10-28T21:30:00.000Z"],
    ["u-beto", "Hábitos y aprendizaje", SEED_TEXTS.beto, "2026-10-29T23:41:00.000Z"],
  ];
  for (const [studentId, title, text, at] of seeds) {
    addSubmission(final, studentId, { title, text, fileName: null }, new Date(at));
  }

  // Corrección de ejemplo ya publicada para Ana, para que la vista del estudiante tenga contenido
  const anaSub = s.submissions.find((x) => x.studentId === "u-ana" && x.assignmentId === final.id)!;
  const phrase = "hacer pausas breves y repasar con mis propias palabras";
  const at = anaSub.text.indexOf(phrase);
  s.feedback.set(anaSub.id, {
    submissionId: anaSub.id, grade: 82, released: true, releasedAt: "2026-10-30T09:00:00.000Z", updatedAt: "2026-10-30T09:00:00.000Z",
    overall: "Buen ensayo: la experiencia personal da voz propia al argumento. Para la próxima, apoya la conclusión con una fuente y cuida la transición entre el segundo y el tercer párrafo.",
    comments: at >= 0 ? [{
      id: "k-seed1", start: at, end: at + phrase.length, createdAt: "2026-10-30T09:00:00.000Z",
      text: "Esta es la idea más sólida del texto. Desarróllala con un ejemplo concreto de tus pausas.",
    }] : [],
  });
}

// ---- sesión -----------------------------------------------------------------------------------

export function findUser(id: string | undefined | null): User | null {
  ensureSeed();
  if (!id) return null;
  return store().users.find((u) => u.id === id) ?? null;
}

export function findUserByEmail(email: string): User | null {
  ensureSeed();
  const e = email.trim().toLowerCase();
  return store().users.find((u) => u.email.toLowerCase() === e) ?? null;
}

export function registerUser(input: { name: string; email: string; role: Role }): Result<User> {
  ensureSeed();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 2 || name.length > 120) return { ok: false, error: "Escribe tu nombre (entre 2 y 120 caracteres)." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { ok: false, error: "El correo no parece válido." };
  if (input.role !== "docente" && input.role !== "estudiante") return { ok: false, error: "Elige un tipo de cuenta." };
  if (findUserByEmail(email)) return { ok: false, error: "Ya existe una cuenta con ese correo." };
  const user: User = { id: uid("u"), name, email, role: input.role };
  store().users.push(user);
  return { ok: true, value: user };
}

export function listDemoUsers(): User[] {
  ensureSeed();
  return store().users;
}

// ---- clases -----------------------------------------------------------------------------------

function canSeeClass(user: User, c: ClassRoom): boolean {
  return c.ownerId === user.id || c.studentIds.includes(user.id);
}

export function listClassesFor(user: User): ClassRoom[] {
  ensureSeed();
  return store().classes.filter((c) => canSeeClass(user, c));
}

export function getClassFor(user: User, classId: string): ClassRoom | null {
  ensureSeed();
  const c = store().classes.find((x) => x.id === classId);
  return c && canSeeClass(user, c) ? c : null;
}

export function createClass(user: User, input: { title: string; expiresAt: string | null }): Result<ClassRoom> {
  ensureSeed();
  if (user.role !== "docente") return fail("Solo el profesorado puede crear clases.");
  const title = input.title.trim();
  if (title.length < 3) return fail("Escribe un nombre de al menos 3 caracteres.");
  if (title.length > 120) return fail("El nombre es demasiado largo (máximo 120 caracteres).");
  let key = "";
  do {
    key = `${title.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X")}-${Math.floor(1000 + Math.random() * 9000)}`;
  } while (store().classes.some((c) => c.enrollmentKey === key));
  const c: ClassRoom = {
    id: uid("c"), ownerId: user.id, title, enrollmentKey: key, expiresAt: input.expiresAt,
    studentIds: [], createdAt: new Date().toISOString(),
  };
  store().classes.push(c);
  return { ok: true, value: c };
}

export function joinClass(user: User, key: string): Result<ClassRoom> {
  ensureSeed();
  if (user.role !== "estudiante") return fail("Solo el estudiantado puede unirse con una clave.");
  const c = store().classes.find((x) => x.enrollmentKey.toLowerCase() === key.trim().toLowerCase());
  if (!c) return fail("No encontramos ninguna clase con esa clave. Revisa que esté bien escrita.");
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return fail("Esta clase ya ha terminado.");
  if (!c.studentIds.includes(user.id)) c.studentIds.push(user.id);
  return { ok: true, value: c };
}

export function listStudents(user: User, classId: string): User[] {
  const c = getClassFor(user, classId);
  if (!c || user.role !== "docente") return [];
  return c.studentIds.map((id) => store().users.find((u) => u.id === id)!).filter(Boolean);
}

// ---- tareas -----------------------------------------------------------------------------------

export function listAssignments(user: User, classId: string): Assignment[] {
  if (!getClassFor(user, classId)) return [];
  return store().assignments
    .filter((a) => a.classId === classId)
    .sort((a, b) => (a.dueAt ?? "9").localeCompare(b.dueAt ?? "9"));
}

export function getAssignmentFor(user: User, assignmentId: string): Assignment | null {
  ensureSeed();
  const a = store().assignments.find((x) => x.id === assignmentId);
  return a && getClassFor(user, a.classId) ? a : null;
}

export interface AssignmentInput {
  title: string;
  instructions: string;
  dueAt: string | null;
  lateAllowed: boolean;
  retention: Retention;
  studentsSeeReport: boolean;
  excludeQuotes: boolean;
  excludeBibliography: boolean;
  excludeBelowWords: number;
  maxPoints: number;
}

export function createAssignment(user: User, classId: string, input: AssignmentInput): Result<Assignment> {
  const c = getClassFor(user, classId);
  if (!c || c.ownerId !== user.id) return fail("No tienes permiso en esta clase.");
  const title = input.title.trim();
  if (title.length < 3) return fail("Escribe un título de al menos 3 caracteres.");
  if (title.length > 160) return fail("El título es demasiado largo (máximo 160 caracteres).");
  if (!Number.isFinite(input.excludeBelowWords) || input.excludeBelowWords < 0 || input.excludeBelowWords > 100) {
    return fail("El mínimo de palabras debe estar entre 0 y 100.");
  }
  if (!Number.isFinite(input.maxPoints) || input.maxPoints < 1 || input.maxPoints > 1000) {
    return fail("La puntuación máxima debe estar entre 1 y 1000.");
  }
  const a: Assignment = { id: uid("a"), classId, ...input, title, createdAt: new Date().toISOString() };
  store().assignments.push(a);
  return { ok: true, value: a };
}

// ---- entregas ---------------------------------------------------------------------------------

function defaultSettings(a: Assignment): ReportSettings {
  return {
    excludeQuotes: a.excludeQuotes,
    excludeBibliography: a.excludeBibliography,
    excludeBelowWords: a.excludeBelowWords,
    excludedSourceIds: [],
  };
}

function corpusFor(sub: Pick<Submission, "id" | "studentId" | "assignmentId">): CorpusDoc[] {
  const s = store();
  return s.corpus.filter((d) => {
    if (d.submissionId === sub.id) return false;
    if (d.submissionId) {
      const other = s.submissions.find((x) => x.id === d.submissionId);
      // versiones anteriores del propio trabajo del mismo estudiante no cuentan
      if (other && other.studentId === sub.studentId && other.assignmentId === sub.assignmentId) return false;
    }
    return true;
  });
}

function buildReport(sub: Submission, settings: ReportSettings): Report {
  const r = compare(sub.text, corpusFor(sub), settings);
  return {
    submissionId: sub.id, status: "ready", score: r.score, settings,
    sources: r.sources, matches: r.matches, generatedAt: new Date().toISOString(),
  };
}

function addSubmission(
  a: Assignment, studentId: string, input: { title: string; text: string; fileName: string | null }, at = new Date(),
): Submission {
  const s = store();
  const prev = s.submissions.filter((x) => x.assignmentId === a.id && x.studentId === studentId);
  const sub: Submission = {
    id: uid("s"), assignmentId: a.id, studentId, version: prev.length + 1,
    title: input.title, fileName: input.fileName, text: input.text, wordCount: countWords(input.text),
    isLate: a.dueAt ? at > new Date(a.dueAt) : false, receiptCode: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
    submittedAt: at.toISOString(),
  };
  s.submissions.push(sub);
  s.reports.set(sub.id, buildReport(sub, defaultSettings(a)));
  if (a.retention !== "none") {
    s.corpus.push({
      id: uid("d"), scope: a.retention === "platform" ? "platform" : "institution", submissionId: sub.id,
      kind: "student_paper", title: "Trabajo de estudiante de la institución", url: null, text: sub.text, // sin nombre ni título: privacidad
    });
  }
  return sub;
}

export function createSubmission(
  user: User, assignmentId: string, input: { title: string; text: string; fileName: string | null },
): Result<Submission> {
  ensureSeed();
  if (user.role !== "estudiante") return fail("Solo el estudiantado puede entregar trabajos.");
  const a = getAssignmentFor(user, assignmentId);
  if (!a) return fail("No encontramos esta tarea.");
  const title = input.title.trim();
  if (title.length < 2) return fail("Escribe un título para tu trabajo.");
  if (title.length > 160) return fail("El título es demasiado largo (máximo 160 caracteres).");
  const text = input.text.replace(/\r\n/g, "\n").trim();
  if (text.length === 0) return fail("No hay texto que entregar. Sube un archivo o pega tu trabajo.");
  if (text.length > MAX_TEXT_CHARS) return fail("El texto es demasiado largo para esta versión.");
  if (countWords(text) < 20) return fail("El trabajo es demasiado corto para analizarlo (mínimo 20 palabras).");
  const now = new Date();
  if (a.dueAt && now > new Date(a.dueAt) && !a.lateAllowed) return fail("El plazo de esta tarea ya ha cerrado.");
  return { ok: true, value: addSubmission(a, user.id, { ...input, title, text }, now) };
}

export interface InboxRow {
  student: User;
  submission: Submission | null;
  score: number | null;
  grade: number | null;
  released: boolean;
}

/** Bandeja del docente: última entrega de cada estudiante de la clase. */
export function inboxFor(user: User, assignmentId: string): InboxRow[] {
  const a = getAssignmentFor(user, assignmentId);
  const c = a && getClassFor(user, a.classId);
  if (!a || !c || c.ownerId !== user.id) return [];
  const s = store();
  return c.studentIds.map((id) => {
    const student = s.users.find((u) => u.id === id)!;
    const subs = s.submissions.filter((x) => x.assignmentId === a.id && x.studentId === id);
    const submission = subs.sort((x, y) => y.version - x.version)[0] ?? null;
    const f = submission ? s.feedback.get(submission.id) : undefined;
    return {
      student, submission, score: submission ? s.reports.get(submission.id)?.score ?? null : null,
      grade: f?.grade ?? null, released: f?.released ?? false,
    };
  }).sort((x, y) => (y.score ?? -1) - (x.score ?? -1) || x.student.name.localeCompare(y.student.name, "es"));
}

export function mySubmissions(user: User, assignmentId: string): Submission[] {
  ensureSeed();
  return store().submissions
    .filter((x) => x.assignmentId === assignmentId && x.studentId === user.id)
    .sort((x, y) => y.version - x.version);
}

function canViewSubmission(user: User, sub: Submission): boolean {
  const a = store().assignments.find((x) => x.id === sub.assignmentId);
  if (!a) return false;
  const c = store().classes.find((x) => x.id === a.classId);
  if (!c) return false;
  if (user.role === "docente") return c.ownerId === user.id;
  return sub.studentId === user.id;
}

export interface ReportView {
  submission: Submission;
  assignment: Assignment;
  student: User;
  report: Report;
  canEdit: boolean;
}

export function getReportFor(user: User, submissionId: string): ReportView | null {
  ensureSeed();
  const s = store();
  const sub = s.submissions.find((x) => x.id === submissionId);
  if (!sub || !canViewSubmission(user, sub)) return null;
  const assignment = s.assignments.find((x) => x.id === sub.assignmentId)!;
  if (user.role === "estudiante" && !assignment.studentsSeeReport) return null;
  const report = s.reports.get(sub.id);
  if (!report) return null;
  const student = s.users.find((u) => u.id === sub.studentId)!;
  // el estudiante no ve las fuentes que el docente ha excluido
  const visible: Report =
    user.role === "estudiante"
      ? { ...report, sources: report.sources.filter((x) => !x.excluded) }
      : report;
  return { submission: sub, assignment, student, report: visible, canEdit: user.role === "docente" };
}

export function updateReportSettings(
  user: User, submissionId: string, patch: Partial<ReportSettings>,
): Result<Report> {
  ensureSeed();
  const s = store();
  const sub = s.submissions.find((x) => x.id === submissionId);
  if (!sub || user.role !== "docente" || !canViewSubmission(user, sub)) return fail("No tienes permiso para cambiar este informe.");
  const current = s.reports.get(sub.id);
  if (!current) return fail("Este trabajo todavía no tiene informe.");
  const min = patch.excludeBelowWords ?? current.settings.excludeBelowWords;
  if (!Number.isFinite(min) || min < 0 || min > 100) return fail("El mínimo de palabras debe estar entre 0 y 100.");
  const next: ReportSettings = { ...current.settings, ...patch, excludeBelowWords: min };
  const report = buildReport(sub, next);
  s.reports.set(sub.id, report);
  return { ok: true, value: report };
}

export function toggleSourceExcluded(user: User, submissionId: string, sourceId: string): Result<Report> {
  ensureSeed();
  const current = store().reports.get(submissionId);
  if (!current) return fail("Este trabajo todavía no tiene informe.");
  const set = new Set(current.settings.excludedSourceIds);
  if (set.has(sourceId)) set.delete(sourceId); else set.add(sourceId);
  return updateReportSettings(user, submissionId, { excludedSourceIds: [...set] });
}

export function scoreOf(submissionId: string): number | null {
  return store().reports.get(submissionId)?.score ?? null;
}

// ---- recuentos para las pantallas (sin exponer el almacén) --------------------------------------

/** Docente: estudiantes que han entregado la tarea. Estudiante: 1 si ha entregado, 0 si no. */
export function submittedCountFor(user: User, assignmentId: string): number {
  const a = getAssignmentFor(user, assignmentId);
  if (!a) return 0;
  const mine = store().submissions.filter((x) => x.assignmentId === a.id && (user.role === "docente" || x.studentId === user.id));
  return new Set(mine.map((x) => x.studentId)).size;
}

export function classSubmissionCount(user: User, classId: string): number {
  return listAssignments(user, classId).reduce((n, a) => n + submittedCountFor(user, a.id), 0);
}


// ---- corrección: comentarios y nota -------------------------------------------------------------

const MAX_COMMENTS = 200;
const MAX_OVERALL = 5000;
const MAX_COMMENT = 2000;

const blankFeedback = (submissionId: string): Feedback => ({
  submissionId, grade: null, overall: "", comments: [], released: false, releasedAt: null, updatedAt: null,
});

function staffSubmission(user: User, submissionId: string) {
  ensureSeed();
  if (user.role !== "docente") return null;
  const sub = store().submissions.find((x) => x.id === submissionId);
  return sub && canViewSubmission(user, sub) ? sub : null;
}

function feedbackOf(submissionId: string): Feedback {
  const s = store();
  let f = s.feedback.get(submissionId);
  if (!f) {
    f = blankFeedback(submissionId);
    s.feedback.set(submissionId, f);
  }
  return f;
}

export interface FeedbackView {
  submission: Submission;
  assignment: Assignment;
  student: User;
  feedback: Feedback;
  score: number | null;
}

/** Vista del docente para corregir. */
export function feedbackFor(user: User, submissionId: string): FeedbackView | null {
  const sub = staffSubmission(user, submissionId);
  if (!sub) return null;
  const s = store();
  return {
    submission: sub,
    assignment: s.assignments.find((x) => x.id === sub.assignmentId)!,
    student: s.users.find((u) => u.id === sub.studentId)!,
    feedback: s.feedback.get(sub.id) ?? blankFeedback(sub.id),
    score: s.reports.get(sub.id)?.score ?? null,
  };
}

export function saveGrade(user: User, submissionId: string, input: { grade: string; overall: string }): Result {
  const sub = staffSubmission(user, submissionId);
  if (!sub) return fail("No tienes permiso para corregir esta entrega.");
  const a = store().assignments.find((x) => x.id === sub.assignmentId)!;
  const raw = input.grade.trim().replace(",", ".");
  let grade: number | null = null;
  if (raw !== "") {
    grade = Number(raw);
    if (!Number.isFinite(grade)) return fail("La nota debe ser un número.");
    if (grade < 0 || grade > a.maxPoints) return fail(`La nota debe estar entre 0 y ${a.maxPoints}.`);
    grade = Math.round(grade * 100) / 100;
  }
  const overall = input.overall.replace(/\r\n/g, "\n").trim();
  if (overall.length > MAX_OVERALL) return fail(`El comentario general es demasiado largo (máximo ${MAX_OVERALL} caracteres).`);
  const f = feedbackOf(sub.id);
  f.grade = grade;
  f.overall = overall;
  f.updatedAt = new Date().toISOString();
  if (f.released && grade === null && overall === "" && f.comments.length === 0) f.released = false;
  return { ok: true, value: undefined };
}

export function addComment(user: User, submissionId: string, input: { start: number; end: number; text: string }): Result<FeedbackComment> {
  const sub = staffSubmission(user, submissionId);
  if (!sub) return fail("No tienes permiso para corregir esta entrega.");
  const text = input.text.trim();
  if (text.length === 0) return fail("Escribe el comentario.");
  if (text.length > MAX_COMMENT) return fail(`El comentario es demasiado largo (máximo ${MAX_COMMENT} caracteres).`);
  const { start, end } = input;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > sub.text.length || start >= end) {
    return fail("Selecciona primero el fragmento del trabajo que quieres comentar.");
  }
  const f = feedbackOf(sub.id);
  if (f.comments.length >= MAX_COMMENTS) return fail("Se alcanzó el máximo de comentarios para esta entrega.");
  if (f.comments.some((c) => start < c.end && end > c.start)) return fail("Ese fragmento se solapa con otro comentario. Elige un tramo distinto.");
  const c: FeedbackComment = { id: uid("k"), start, end, text, createdAt: new Date().toISOString() };
  f.comments.push(c);
  f.comments.sort((x, y) => x.start - y.start);
  f.updatedAt = c.createdAt;
  return { ok: true, value: c };
}

export function deleteComment(user: User, submissionId: string, commentId: string): Result {
  const sub = staffSubmission(user, submissionId);
  if (!sub) return fail("No tienes permiso para corregir esta entrega.");
  const f = feedbackOf(sub.id);
  const before = f.comments.length;
  f.comments = f.comments.filter((c) => c.id !== commentId);
  if (f.comments.length === before) return fail("No encontramos ese comentario.");
  f.updatedAt = new Date().toISOString();
  return { ok: true, value: undefined };
}

export function setReleased(user: User, submissionId: string, released: boolean): Result {
  const sub = staffSubmission(user, submissionId);
  if (!sub) return fail("No tienes permiso para corregir esta entrega.");
  const f = feedbackOf(sub.id);
  if (released && f.grade === null && f.overall === "" && f.comments.length === 0) {
    return fail("Pon una nota o un comentario antes de publicar la corrección.");
  }
  f.released = released;
  f.releasedAt = released ? new Date().toISOString() : null;
  return { ok: true, value: undefined };
}

export interface ResultView {
  submission: Submission;
  assignment: Assignment;
  /** null mientras el docente no ha publicado la corrección */
  feedback: Feedback | null;
}

/** Vista del estudiante: solo su entrega y solo si la corrección está publicada. */
export function resultFor(user: User, submissionId: string): ResultView | null {
  ensureSeed();
  if (user.role !== "estudiante") return null;
  const s = store();
  const sub = s.submissions.find((x) => x.id === submissionId);
  if (!sub || sub.studentId !== user.id) return null;
  const f = s.feedback.get(sub.id);
  return {
    submission: sub,
    assignment: s.assignments.find((x) => x.id === sub.assignmentId)!,
    feedback: f && f.released ? f : null,
  };
}

export function releasedFeedbackOf(submissionId: string): Feedback | null {
  const f = store().feedback.get(submissionId);
  return f && f.released ? f : null;
}

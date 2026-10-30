// Tipos del dominio. Los nombres siguen schema.sql para que la capa real sea un cambio de implementación.

export type Role = "docente" | "estudiante";
export type Retention = "platform" | "institution" | "none";
export type SourceKind = "student_paper" | "web" | "publication";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ClassRoom {
  id: string;
  ownerId: string;
  title: string;
  enrollmentKey: string;
  expiresAt: string | null;
  studentIds: string[];
  createdAt: string;
}

export interface Assignment {
  id: string;
  classId: string;
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
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  version: number;
  title: string;
  fileName: string | null;
  text: string;
  wordCount: number;
  isLate: boolean;
  receiptCode: string;
  submittedAt: string;
}

export interface CorpusDoc {
  id: string;
  scope: "institution" | "platform";
  submissionId: string | null;
  kind: SourceKind;
  title: string;
  url: string | null;
  text: string;
}

export interface ReportSettings {
  excludeQuotes: boolean;
  excludeBibliography: boolean;
  excludeBelowWords: number;
  excludedSourceIds: string[];
}

export interface ReportSource {
  id: string; // = id del documento del corpus
  kind: SourceKind;
  title: string;
  url: string | null;
  percent: number;
  colorIdx: number; // 1..8
  excluded: boolean;
}

export interface ReportMatch {
  sourceId: string;
  startChar: number;
  endChar: number;
}

export interface Report {
  submissionId: string;
  status: "ready" | "failed";
  score: number;
  settings: ReportSettings;
  sources: ReportSource[];
  matches: ReportMatch[];
  generatedAt: string;
}

export type SimBand = "none" | "low" | "mid" | "high";

export function simBand(score: number): SimBand {
  if (score <= 0) return "none";
  if (score < 25) return "low";
  if (score < 50) return "mid";
  return "high";
}

/** Comentario anclado a un tramo del texto entregado (posiciones de carácter, fin exclusivo). */
export interface FeedbackComment {
  id: string;
  start: number;
  end: number;
  text: string;
  createdAt: string;
}

export interface Feedback {
  submissionId: string;
  grade: number | null;
  overall: string;
  comments: FeedbackComment[];
  released: boolean;
  releasedAt: string | null;
  updatedAt: string | null;
}

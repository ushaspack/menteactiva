import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CommentedText } from "@/components/commented-text";
import { ButtonLink, Card, EmptyState, Tag } from "@/components/ui";
import { resultFor } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Mi nota y comentarios" };

export default async function ResultadoPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const user = await requireUser();
  if (user.role === "docente") redirect(`/entregas/${submissionId}/feedback`);
  const view = resultFor(user, submissionId);
  if (!view) notFound();
  const { submission, assignment, feedback } = view;

  return (
    <>
      <div className="mb-6 min-w-0">
        <div className="text-sm text-text-muted mb-2">
          <Link href={`/tareas/${assignment.id}`} className="hover:underline">{assignment.title}</Link> · <Tag>S14</Tag>
        </div>
        <h1 className="font-display font-bold text-2xl leading-tight">Mi nota y comentarios</h1>
        <p className="text-sm text-text-muted mt-1 wrap-anywhere">
          «{submission.title}» · versión {submission.version} · {formatDate(submission.submittedAt, true)}
        </p>
      </div>

      {!feedback ? (
        <EmptyState
          title="Tu docente aún no ha publicado la corrección"
          text="Cuando la publique, verás aquí tu nota y sus comentarios sobre el texto."
          action={<ButtonLink href={`/tareas/${assignment.id}`} variant="secondary">Volver a la tarea</ButtonLink>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] items-start">
          <Card>
            <CommentedText text={submission.text} comments={feedback.comments} id="texto-resultado" />
          </Card>
          <aside aria-label="Resumen de la corrección" className="grid gap-4">
            <Card>
              <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium mb-1">Nota</h2>
              {feedback.grade !== null ? (
                <p className="font-display font-bold text-4xl">
                  {feedback.grade.toLocaleString("es-ES")} <span className="text-lg text-text-muted">/ {assignment.maxPoints}</span>
                </p>
              ) : (
                <p className="text-text-muted">Sin nota numérica.</p>
              )}
              {feedback.overall ? (
                <>
                  <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium mt-4 mb-1">Comentario general</h2>
                  <p className="whitespace-pre-wrap wrap-anywhere">{feedback.overall}</p>
                </>
              ) : null}
              <p className="text-xs text-text-muted mt-4">Publicado el {formatDate(feedback.releasedAt ?? "", true)}</p>
            </Card>
            <Card>
              <h2 className="font-display font-bold text-lg mb-1">Comentarios sobre el texto</h2>
              {feedback.comments.length === 0 ? (
                <p className="text-sm text-text-muted">No hay comentarios sobre fragmentos del texto.</p>
              ) : (
                <ol className="list-none p-0 m-0 mt-3 grid gap-3">
                  {feedback.comments.map((c, i) => (
                    <li key={c.id} className="text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                      <a href={`#c-${c.id}`} className="flex items-start gap-2 text-text-muted hover:underline">
                        <span className="shrink-0 grid place-items-center size-5 rounded-full bg-comment-badge text-comment-on text-[11px] font-medium" aria-hidden="true">{i + 1}</span>
                        <span className="line-clamp-2 wrap-anywhere">«{submission.text.slice(c.start, c.end)}»</span>
                      </a>
                      <p className="mt-1 wrap-anywhere whitespace-pre-wrap">{c.text}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </aside>
        </div>
      )}
    </>
  );
}

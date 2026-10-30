import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCommentAction, releaseAction } from "@/app/actions";
import { CommentedText } from "@/components/commented-text";
import { SelectionComposer } from "@/components/selection-composer";
import { GradeForm } from "@/components/forms";
import { Alert, buttonClass, ButtonLink, Card, SimBadge, Tag } from "@/components/ui";
import { feedbackFor } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Corregir entrega" };

export default async function FeedbackPage({
  params, searchParams,
}: {
  params: Promise<{ submissionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { submissionId } = await params;
  const { error } = await searchParams;
  const user = await requireUser();
  const view = feedbackFor(user, submissionId);
  if (!view) notFound();
  const { submission, assignment, student, feedback, score } = view;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="text-sm text-text-muted mb-2">
            <Link href={`/tareas/${assignment.id}`} className="hover:underline">{assignment.title}</Link> · {student.name} · <Tag>S11</Tag>
          </div>
          <h1 className="font-display font-bold text-2xl leading-tight wrap-anywhere">Corregir entrega</h1>
          <p className="text-sm text-text-muted mt-1 wrap-anywhere">
            «{submission.title}» · versión {submission.version} · {submission.wordCount} palabras · {formatDate(submission.submittedAt, true)}
            {submission.isLate ? " · entrega tardía" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {score !== null ? <SimBadge score={score} /> : null}
          <ButtonLink href={`/entregas/${submission.id}/informe`} variant="secondary" small>Ver informe de similitud</ButtonLink>
        </div>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] items-start">
        <Card>
          <SelectionComposer submissionId={submission.id}>
            <CommentedText text={submission.text} comments={feedback.comments} />
          </SelectionComposer>
        </Card>

        <aside aria-label="Nota y comentarios" className="grid gap-4">
          <Card>
            <h2 className="font-display font-bold text-lg mb-3">Nota</h2>
            <GradeForm submissionId={submission.id} grade={feedback.grade} overall={feedback.overall} maxPoints={assignment.maxPoints} />
          </Card>

          <Card>
            <h2 className="font-display font-bold text-lg mb-1">Comentarios del texto</h2>
            {feedback.comments.length === 0 ? (
              <p className="text-sm text-text-muted">Todavía no hay comentarios. Selecciona un fragmento del trabajo para añadir el primero.</p>
            ) : (
              <ol className="list-none p-0 m-0 mt-3 grid gap-3">
                {feedback.comments.map((c, i) => (
                  <li key={c.id} className="text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                    <a href={`#c-${c.id}`} className="flex items-start gap-2 text-text-muted hover:underline">
                      <span className="shrink-0 grid place-items-center size-5 rounded-full bg-comment-badge text-comment-on text-[11px] font-medium" aria-hidden="true">{i + 1}</span>
                      <span className="line-clamp-2 wrap-anywhere">«{submission.text.slice(c.start, c.end)}»</span>
                    </a>
                    <p className="mt-1 wrap-anywhere whitespace-pre-wrap">{c.text}</p>
                    <form action={deleteCommentAction} className="mt-1">
                      <input type="hidden" name="submissionId" value={submission.id} />
                      <input type="hidden" name="commentId" value={c.id} />
                      <button className={buttonClass("ghost", true)} aria-label={`Eliminar el comentario ${i + 1}`}>Eliminar</button>
                    </form>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card>
            <h2 className="font-display font-bold text-lg mb-1">Publicar</h2>
            <p className="text-sm text-text-muted mb-3">
              {feedback.released
                ? `La persona ya ve su nota y sus comentarios (publicado el ${formatDate(feedback.releasedAt ?? "", true)}). Si cambias algo, lo verá al instante.`
                : "Hasta que publiques, la persona no ve nada de esta corrección."}
            </p>
            <form action={releaseAction}>
              <input type="hidden" name="submissionId" value={submission.id} />
              <input type="hidden" name="release" value={feedback.released ? "0" : "1"} />
              <button className={buttonClass(feedback.released ? "secondary" : "primary")}>
                {feedback.released ? "Retirar publicación" : "Publicar corrección"}
              </button>
            </form>
          </Card>
        </aside>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitWorkForm } from "@/components/forms";
import { Alert, ButtonLink, Card, EmptyState, PageHead, SimBadge, Tag } from "@/components/ui";
import { getAssignmentFor, getClassFor, inboxFor, mySubmissions, releasedFeedbackOf, scoreOf } from "@/lib/data";
import { formatDate, formatDateLong } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Tarea" };

export default async function TareaPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const user = await requireUser();
  const a = getAssignmentFor(user, assignmentId);
  const c = a && getClassFor(user, a.classId);
  if (!a || !c) notFound();

  const crumbs = (id: string) => (
    <><Link href={`/clases/${c.id}`} className="hover:underline">{c.title}</Link> · <Tag>{id}</Tag></>
  );

  // ---- S05: bandeja del docente ------------------------------------------------------------
  if (user.role === "docente") {
    const rows = inboxFor(user, a.id);
    return (
      <>
        <PageHead title={a.title} crumbs={crumbs("S05")} />
        {a.instructions ? <p className="text-text-muted max-w-reader mb-6">{a.instructions}</p> : null}
        {rows.length === 0 ? (
          <EmptyState title="Aún no hay estudiantes" text="Comparte la clave de la clase para que se unan." />
        ) : (
          <div className="relative bg-surface border border-border rounded-lg overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse">
              <caption className="sr-only">Entregas de la tarea {a.title}</caption>
              <thead>
                <tr>
                  {["Estudiante", "Título", "Entrega", "Similitud", "Nota"].map((h) => (
                    <th key={h} scope="col" className="text-left text-xs uppercase tracking-widest text-text-muted font-medium p-3 border-b border-border">{h}</th>
                  ))}
                  <th scope="col" className="p-3 border-b border-border"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ student, submission, score, grade, released }) => (
                  <tr key={student.id} className="hover:bg-surface-raised">
                    <td className="p-3 border-b border-border text-sm">
                      {student.name} {submission?.isLate ? <Tag>Tarde</Tag> : null}
                    </td>
                    {submission ? (
                      <>
                        <td className="p-3 border-b border-border text-sm wrap-anywhere max-w-xs">{submission.title}</td>
                        <td className="p-3 border-b border-border text-sm whitespace-nowrap">{formatDate(submission.submittedAt, true)}</td>
                        <td className="p-3 border-b border-border text-sm">
                          {score !== null ? (
                            <Link href={`/entregas/${submission.id}/informe`}><SimBadge score={score} /></Link>
                          ) : "—"}
                        </td>
                        <td className="p-3 border-b border-border text-sm whitespace-nowrap">
                          {grade !== null ? `${grade.toLocaleString("es-ES")} / ${a.maxPoints}` : "—"}{" "}
                          {released ? <Tag>Publicada</Tag> : grade !== null ? <Tag>Sin publicar</Tag> : null}
                        </td>
                        <td className="p-3 border-b border-border text-right whitespace-nowrap">
                          <ButtonLink href={`/entregas/${submission.id}/feedback`} variant="secondary" small>Corregir</ButtonLink>{" "}
                          <ButtonLink href={`/entregas/${submission.id}/informe`} variant="ghost" small>Ver informe</ButtonLink>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 border-b border-border text-sm text-text-muted">Sin entregar</td>
                        <td className="p-3 border-b border-border text-sm text-text-muted">—</td>
                        <td className="p-3 border-b border-border text-sm text-text-muted">—</td>
                        <td className="p-3 border-b border-border text-sm text-text-muted">—</td>
                        <td className="p-3 border-b border-border" />
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  // ---- S08: entrega del estudiante ---------------------------------------------------------
  const now = new Date();
  const overdue = a.dueAt ? now > new Date(a.dueAt) : false;
  const closed = overdue && !a.lateAllowed;
  const previous = mySubmissions(user, a.id);

  return (
    <>
      <PageHead
        title={a.title}
        crumbs={crumbs("S08")}
        actions={<Tag>{a.dueAt ? `Fecha límite: ${formatDateLong(a.dueAt)}` : "Sin fecha límite"}</Tag>}
      />
      {a.instructions ? <p className="text-text-muted max-w-reader mb-6">{a.instructions}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
        <Card>
          {closed ? (
            <Alert tone="error">El plazo de esta tarea cerró el {formatDateLong(a.dueAt)}. Ya no se aceptan entregas.</Alert>
          ) : (
            <>
              {overdue ? (
                <Alert>El plazo venció el {formatDateLong(a.dueAt)}. Puedes entregar, pero quedará marcado como tardío.</Alert>
              ) : null}
              <SubmitWorkForm assignmentId={a.id} />
            </>
          )}
        </Card>

        <aside aria-label="Estado de tus entregas">
          <Card>
            <h2 className="font-display font-bold text-lg mb-3">Tus entregas</h2>
            {previous.length === 0 ? (
              <p className="text-sm text-text-muted">Todavía no has entregado nada.</p>
            ) : (
              <ul className="list-none p-0 m-0 grid gap-3">
                {previous.map((s) => {
                  const score = scoreOf(s.id);
                  return (
                    <li key={s.id} className="text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                      <div className="font-medium wrap-anywhere">{s.title}</div>
                      <div className="text-text-muted text-xs mb-1">
                        Versión {s.version} · {formatDate(s.submittedAt, true)} {s.isLate ? "· tardía" : ""}
                      </div>
                      {releasedFeedbackOf(s.id) ? (
                        <Link href={`/entregas/${s.id}/resultado`} className="inline-flex items-center gap-2 hover:underline mr-3">
                          Ver nota y comentarios
                        </Link>
                      ) : null}
                      {score !== null && a.studentsSeeReport ? (
                        <Link href={`/entregas/${s.id}/informe`} className="inline-flex items-center gap-2 hover:underline">
                          <SimBadge score={score} /> Ver informe
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}

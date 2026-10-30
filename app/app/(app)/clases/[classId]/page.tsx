import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink, Card, EmptyState, PageHead, Tag } from "@/components/ui";
import { getClassFor, listAssignments, mySubmissions, submittedCountFor } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Clase" };

export default async function ClasePage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const user = await requireUser();
  const c = getClassFor(user, classId);
  if (!c) notFound();
  const teacher = user.role === "docente";
  const assignments = listAssignments(user, c.id);
  const now = new Date();

  return (
    <>
      <PageHead
        title={c.title}
        crumbs={<><Link href="/clases" className="hover:underline">Mis clases</Link> · <Tag>{teacher ? "S05" : "S07"}</Tag></>}
        actions={
          teacher ? (
            <>
              <ButtonLink href={`/clases/${c.id}/estudiantes`} variant="secondary">Estudiantes</ButtonLink>
              <ButtonLink href={`/clases/${c.id}/tareas/nueva`}>Crear tarea</ButtonLink>
            </>
          ) : null
        }
      />
      {teacher ? (
        <p className="text-sm text-text-muted mb-6">
          Clave para unirse: <strong className="text-text">{c.enrollmentKey}</strong> · {c.studentIds.length} estudiantes
        </p>
      ) : null}

      {assignments.length === 0 ? (
        <EmptyState
          title="Esta clase aún no tiene tareas"
          text={teacher ? "Crea una tarea para empezar a recibir trabajos." : "Cuando tu docente publique una tarea, aparecerá aquí."}
          action={teacher ? <ButtonLink href={`/clases/${c.id}/tareas/nueva`}>Crear tarea</ButtonLink> : undefined}
        />
      ) : (
        <ul className="grid gap-4 list-none p-0 m-0">
          {assignments.map((a) => {
            const overdue = a.dueAt ? now > new Date(a.dueAt) : false;
            const mine = mySubmissions(user, a.id)[0];
            const status = teacher
              ? `${submittedCountFor(user, a.id)} de ${c.studentIds.length} han entregado`
              : mine
                ? mine.isLate ? "Entregado con retraso" : "Entregado"
                : overdue && !a.lateAllowed ? "Plazo cerrado" : overdue ? "Plazo vencido, se aceptan tardías" : "Sin entregar";
            return (
              <li key={a.id}>
                <Card className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display font-bold text-lg wrap-anywhere">
                      <Link href={`/tareas/${a.id}`} className="hover:underline">{a.title}</Link>
                    </h2>
                    <p className="text-sm text-text-muted">
                      {a.dueAt ? `Fecha límite: ${formatDate(a.dueAt, true)}` : "Sin fecha límite"} · {status}
                    </p>
                  </div>
                  <ButtonLink href={`/tareas/${a.id}`} variant={teacher || mine ? "secondary" : "primary"} small>
                    {teacher ? "Ver entregas" : mine ? "Ver mi entrega" : "Entregar"}
                  </ButtonLink>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

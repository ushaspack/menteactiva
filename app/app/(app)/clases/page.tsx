import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, EmptyState, PageHead, Tag } from "@/components/ui";
import { JoinClassForm } from "@/components/forms";
import { classSubmissionCount, listAssignments, listClassesFor } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Mis clases" };

export default async function ClasesPage() {
  const user = await requireUser();
  const classes = listClassesFor(user);
  const teacher = user.role === "docente";

  return (
    <>
      <PageHead
        id="titulo"
        title="Mis clases"
        crumbs={<Tag>S02</Tag>}
        actions={teacher ? <ButtonLink href="/clases/nueva">Crear clase</ButtonLink> : null}
      />

      {classes.length === 0 ? (
        teacher ? (
          <EmptyState
            title="Aún no tienes clases"
            text="Crea tu primera clase y comparte su clave con tus estudiantes."
            action={<ButtonLink href="/clases/nueva">Crear clase</ButtonLink>}
          />
        ) : (
          <EmptyState title="Todavía no estás en ninguna clase" text="Usa la clave que te dé tu docente para unirte." />
        )
      ) : (
        <ul className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,18.75rem),1fr))] list-none p-0 m-0">
          {classes.map((c) => {
            const assignments = listAssignments(user, c.id);
            const subCount = classSubmissionCount(user, c.id);
            return (
              <li key={c.id}>
                <Card className="h-full flex flex-col">
                  <h2 className="font-display font-bold text-lg mb-1 wrap-anywhere">
                    <Link href={`/clases/${c.id}`} className="hover:underline">{c.title}</Link>
                  </h2>
                  <p className="text-sm text-text-muted">
                    {c.studentIds.length} {c.studentIds.length === 1 ? "estudiante" : "estudiantes"}
                    {c.expiresAt ? ` · cierra el ${formatDate(c.expiresAt)}` : ""}
                  </p>
                  <div className="flex justify-between mt-4">
                    <div>
                      <div className="font-display font-bold text-2xl leading-none">{assignments.length}</div>
                      <div className="text-xs text-text-muted">{assignments.length === 1 ? "tarea" : "tareas"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display font-bold text-2xl leading-none">
                        {subCount}
                      </div>
                      <div className="text-xs text-text-muted">{teacher ? "entregas" : "mis entregas"}</div>
                    </div>
                  </div>
                  <div className="mt-auto pt-4 flex items-center justify-between gap-3">
                    {teacher ? <Tag>Clave: {c.enrollmentKey}</Tag> : <span />}
                    <ButtonLink href={`/clases/${c.id}`} variant="secondary" small>Abrir</ButtonLink>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {!teacher ? (
        <section className="mt-10" aria-labelledby="unirse">
          <h2 id="unirse" className="font-display font-bold text-lg mb-3">Unirme a una clase</h2>
          <JoinClassForm />
        </section>
      ) : null}
    </>
  );
}

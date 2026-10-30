import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toggleSourceAction, updateExclusionsAction } from "@/app/actions";
import { HighlightedText, MATCH_BADGE } from "@/components/highlighted-text";
import { Alert, buttonClass, ButtonLink, Card, Check, Field, SimBadge, Tag, TextInput } from "@/components/ui";
import { getReportFor } from "@/lib/data";
import { formatDate, formatPercent } from "@/lib/format";
import { requireUser } from "@/lib/session";
import type { SourceKind } from "@/lib/types";

export const metadata: Metadata = { title: "Informe de similitud" };

const kindLabel: Record<SourceKind, string> = {
  student_paper: "Trabajo de estudiante",
  publication: "Publicación",
  web: "Sitio web",
};

export default async function InformePage({
  params, searchParams,
}: {
  params: Promise<{ submissionId: string }>;
  searchParams: Promise<{ recibido?: string; error?: string }>;
}) {
  const { submissionId } = await params;
  const { recibido, error } = await searchParams;
  const user = await requireUser();
  const view = getReportFor(user, submissionId);
  if (!view) notFound();
  const { submission, assignment, student, report, canEdit } = view;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="text-sm text-text-muted mb-2">
            <Link href={`/tareas/${assignment.id}`} className="hover:underline">{assignment.title}</Link>
            {canEdit ? <> · {student.name}</> : null} · <Tag>S09</Tag>
          </div>
          <h1 className="font-display font-bold text-2xl leading-tight wrap-anywhere">Informe de similitud</h1>
          <p className="text-sm text-text-muted mt-1 wrap-anywhere">
            «{submission.title}» · versión {submission.version} · {submission.wordCount} palabras · {formatDate(submission.submittedAt, true)}
            {submission.isLate ? " · entrega tardía" : ""}
          </p>
        </div>
        <SimBadge score={report.score} big />
      </div>

      {recibido ? (
        <Alert tone="success">
          Trabajo entregado. Tu recibo es <strong>{submission.receiptCode}</strong>; guárdalo como comprobante.
        </Alert>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Alert>
        Una similitud alta no es plagio por sí sola: indica texto que coincide con otras fuentes y que conviene revisar con criterio. MenteActiva no intenta adivinar si un texto lo escribió una IA.
      </Alert>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] items-start">
        <Card>
          <h2 className="sr-only">Texto del trabajo</h2>
          <HighlightedText text={submission.text} matches={report.matches} sources={report.sources} />
        </Card>

        <aside aria-label="Coincidencias y ajustes" className="grid gap-4">
          <Card>
            <h2 className="font-display font-bold text-lg mb-2">Coincidencias</h2>
            {report.sources.length === 0 ? (
              <p className="text-sm text-text-muted">No hemos encontrado texto que coincida con otras fuentes.</p>
            ) : (
              <ul className="list-none p-0 m-0">
                {report.sources.map((s) => (
                  <li key={s.id} className={`py-3 border-b border-border last:border-0 text-sm ${s.excluded ? "opacity-60" : ""}`}>
                    <div className="flex items-start gap-3">
                      <span className={`${MATCH_BADGE[s.colorIdx]} text-sim-on shrink-0 grid place-items-center size-6 rounded-full text-xs font-medium`} aria-hidden="true">
                        {s.colorIdx}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className={`wrap-anywhere ${s.excluded ? "line-through" : ""}`}>
                          {s.url ? (
                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.title}</a>
                          ) : s.title}
                        </div>
                        <div className="text-xs text-text-muted">
                          Fuente {s.colorIdx} · {kindLabel[s.kind]}{s.excluded ? " · excluida" : ""}
                        </div>
                      </div>
                      <span className="font-medium whitespace-nowrap">{formatPercent(s.percent)}</span>
                    </div>
                    {canEdit ? (
                      <form action={toggleSourceAction} className="mt-2 pl-9">
                        <input type="hidden" name="submissionId" value={submission.id} />
                        <input type="hidden" name="sourceId" value={s.id} />
                        <button className={buttonClass("ghost", true)} aria-label={`${s.excluded ? "Incluir" : "Excluir"} la fuente ${s.colorIdx}: ${s.title}`}>
                          {s.excluded ? "Incluir fuente" : "Excluir fuente"}
                        </button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {canEdit ? (
            <Card>
              <h2 className="font-display font-bold text-lg mb-3">Filtros</h2>
              <form action={updateExclusionsAction}>
                <input type="hidden" name="submissionId" value={submission.id} />
                <Check id="excludeQuotes" name="excludeQuotes" label="Excluir citas textuales" defaultChecked={report.settings.excludeQuotes} />
                <Check id="excludeBibliography" name="excludeBibliography" label="Excluir bibliografía" defaultChecked={report.settings.excludeBibliography} />
                <Field id="minWords" label="Ignorar coincidencias de menos de (palabras)" help="De 0 a 100.">
                  <TextInput id="minWords" name="minWords" type="number" min={0} max={100} inputMode="numeric" defaultValue={report.settings.excludeBelowWords} className="max-w-28" aria-describedby="minWords-help" />
                </Field>
                <button className={buttonClass("secondary")}>Aplicar filtros</button>
              </form>
            </Card>
          ) : null}

          <ButtonLink href={`/tareas/${assignment.id}`} variant="ghost">Volver a la tarea</ButtonLink>
        </aside>
      </div>
    </>
  );
}

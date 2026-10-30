import { ButtonLink, Card, PageHead, Tag } from "./ui";

/** Pantalla del mapa de reconocimiento que aún no está construida. Mantiene la ruta viva. */
export function Pendiente({ id, title, text, backHref = "/clases" }: { id: string; title: string; text: string; backHref?: string }) {
  return (
    <>
      <PageHead title={title} crumbs={<Tag>{id}</Tag>} />
      <Card>
        <p className="text-text-muted mb-4 max-w-reader">{text}</p>
        <ButtonLink href={backHref} variant="secondary">Volver</ButtonLink>
      </Card>
    </>
  );
}

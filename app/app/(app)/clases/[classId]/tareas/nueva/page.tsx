import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewAssignmentForm } from "@/components/forms";
import { PageHead, Tag } from "@/components/ui";
import { getClassFor } from "@/lib/data";
import { requireTeacher } from "@/lib/session";

export const metadata: Metadata = { title: "Crear tarea" };

export default async function NuevaTareaPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const user = await requireTeacher();
  const c = getClassFor(user, classId);
  if (!c || c.ownerId !== user.id) notFound();
  return (
    <>
      <PageHead
        title="Crear tarea"
        crumbs={<><Link href={`/clases/${c.id}`} className="hover:underline">{c.title}</Link> · <Tag>S06</Tag></>}
      />
      <NewAssignmentForm classId={c.id} />
    </>
  );
}

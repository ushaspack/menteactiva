import type { Metadata } from "next";
import { NewClassForm } from "@/components/forms";
import { PageHead, Tag } from "@/components/ui";
import { requireTeacher } from "@/lib/session";

export const metadata: Metadata = { title: "Crear clase" };

export default async function NuevaClasePage() {
  await requireTeacher();
  return (
    <>
      <PageHead title="Crear clase" crumbs={<Tag>S03</Tag>} />
      <NewClassForm />
    </>
  );
}

import type { Metadata } from "next";
import { Pendiente } from "@/components/pendiente";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Comentarios guardados" };

export default async function Page() {
  await requireUser();
  return <Pendiente id="S12" title="Comentarios guardados" text="Los conjuntos de comentarios reutilizables llegan en la siguiente fase." />;
}

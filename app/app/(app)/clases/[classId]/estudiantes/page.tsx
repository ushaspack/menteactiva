import type { Metadata } from "next";
import { Pendiente } from "@/components/pendiente";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Estudiantes de la clase" };

export default async function Page() {
  await requireUser();
  return <Pendiente id="S04" title="Estudiantes de la clase" text="La gestión de estudiantes (matricular por lista, bloquear, anonimato) llega en la siguiente fase." />;
}

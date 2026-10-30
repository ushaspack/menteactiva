import type { Metadata } from "next";
import { Pendiente } from "@/components/pendiente";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Administración" };

export default async function Page() {
  await requireUser();
  return <Pendiente id="S18" title="Administración" text="El panel de la institución, con estadísticas de uso, llega en la siguiente fase." />;
}

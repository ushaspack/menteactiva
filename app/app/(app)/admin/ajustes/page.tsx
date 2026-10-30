import type { Metadata } from "next";
import { Pendiente } from "@/components/pendiente";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Ajustes de la institución" };

export default async function Page() {
  await requireUser();
  return <Pendiente id="S19" title="Ajustes de la institución" text="Los ajustes de retención y liberación de la institución llegan en la siguiente fase." />;
}

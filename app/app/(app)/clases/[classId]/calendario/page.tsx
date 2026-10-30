import type { Metadata } from "next";
import { Pendiente } from "@/components/pendiente";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Calendario de clase" };

export default async function Page() {
  await requireUser();
  return <Pendiente id="S15" title="Calendario de clase" text="El calendario de la clase es una función opcional que llegará más adelante." />;
}

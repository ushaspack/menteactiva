import type { Metadata } from "next";
import { Pendiente } from "@/components/pendiente";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Revisión entre pares" };

export default async function Page() {
  await requireUser();
  return <Pendiente id="S16" title="Revisión entre pares" text="La revisión entre pares es una función opcional que llegará más adelante." />;
}

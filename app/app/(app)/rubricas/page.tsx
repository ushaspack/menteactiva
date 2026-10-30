import type { Metadata } from "next";
import { Pendiente } from "@/components/pendiente";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Rúbricas" };

export default async function Page() {
  await requireUser();
  return <Pendiente id="S13" title="Rúbricas" text="El editor de rúbricas llega en la siguiente fase." />;
}

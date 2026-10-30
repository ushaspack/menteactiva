import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/forms";
import { Card, Wordmark } from "@/components/ui";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegistroPage() {
  if (await currentUser()) redirect("/clases");
  return (
    <main className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><Wordmark big className="text-3xl" /></div>
        <Card>
          <h1 className="font-display font-bold text-xl mb-4">Crear cuenta</h1>
          <RegisterForm />
          <p className="text-sm text-text-muted mt-4">
            ¿Ya tienes cuenta? <Link href="/entrar" className="underline">Entrar</Link>
          </p>
        </Card>
      </div>
    </main>
  );
}

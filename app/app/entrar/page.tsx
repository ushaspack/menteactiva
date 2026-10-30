import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { demoLoginAction } from "@/app/actions";
import { LoginForm } from "@/components/forms";
import { Alert, buttonClass, Card, Wordmark } from "@/components/ui";
import { listDemoUsers } from "@/lib/data";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPage() {
  if (await currentUser()) redirect("/clases");
  const demo = process.env.DEMO_MODE !== "0";
  const users = demo ? listDemoUsers() : [];
  const docentes = users.filter((u) => u.role === "docente");
  const estudiantes = users.filter((u) => u.role === "estudiante");

  return (
    <main className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <Wordmark big className="text-3xl" />
        </div>
        <Card>
          <h1 className="font-display font-bold text-xl mb-1">Entrar</h1>
          <LoginForm />
          <p className="text-sm text-text-muted mt-4">
            ¿Aún no tienes cuenta? <Link href="/registro" className="underline">Crear cuenta</Link>
          </p>
          {demo ? (
            <div className="mt-6 pt-6 border-t border-border">
              <Alert>Modo demostración: personas de ejemplo con datos ficticios.</Alert>
          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium mb-2">Docente</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {docentes.map((u) => (
              <form key={u.id} action={demoLoginAction}>
                <input type="hidden" name="userId" value={u.id} />
                <button className={buttonClass("primary")}>Entrar como {u.name}</button>
              </form>
            ))}
          </div>

          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium mb-2">Estudiantes</h2>
          <div className="flex flex-wrap gap-2">
            {estudiantes.map((u) => (
              <form key={u.id} action={demoLoginAction}>
                <input type="hidden" name="userId" value={u.id} />
                <button className={buttonClass("secondary")}>{u.name}</button>
              </form>
            ))}
          </div>
            </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}

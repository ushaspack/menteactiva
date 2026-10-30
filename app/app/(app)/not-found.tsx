import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="max-w-xl">
      <h1 className="font-display font-bold text-2xl mb-2">No encontramos esta página</h1>
      <p className="text-text-muted mb-4">Puede que el enlace sea antiguo o que no tengas acceso a esta clase o tarea.</p>
      <ButtonLink href="/clases">Ir a mis clases</ButtonLink>
    </div>
  );
}

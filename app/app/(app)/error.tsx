"use client";

import { Alert, buttonClass } from "@/components/ui";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-xl">
      <h1 className="font-display font-bold text-2xl mb-4">Algo ha salido mal</h1>
      <Alert tone="error">No hemos podido cargar esta pantalla. Puedes volver a intentarlo.</Alert>
      <button onClick={reset} className={buttonClass("primary")}>Reintentar</button>
    </div>
  );
}

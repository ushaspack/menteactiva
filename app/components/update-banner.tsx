"use client";

import { useEffect, useState } from "react";
import { buttonClass } from "./ui";

interface UpdateState {
  status: "idle" | "checking" | "none" | "available" | "downloading" | "ready" | "error";
  version: string | null;
  percent: number;
  notes: string;
  error: string;
  lastChecked: string | null;
}
interface Desktop {
  version: string;
  platform: string;
  getUpdateState(): Promise<UpdateState>;
  checkForUpdates(): Promise<UpdateState>;
  downloadUpdate(): Promise<UpdateState>;
  installUpdate(): Promise<void>;
  onUpdateState(cb: (s: UpdateState) => void): () => void;
}
const desk = (): Desktop | undefined => (typeof window === "undefined" ? undefined : (window as unknown as { menteactivaDesktop?: Desktop }).menteactivaDesktop);

/** Aviso de nueva versión. Solo aparece en la app de escritorio; en el navegador no pinta nada. */
export function UpdateBanner() {
  const [state, setState] = useState<UpdateState | null>(null);
  const [hidden, setHidden] = useState<string | null>(null);
  const [present, setPresent] = useState(false);

  useEffect(() => {
    const d = desk();
    if (!d) return;
    setPresent(true);
    d.getUpdateState().then(setState).catch(() => {});
    try { setHidden(sessionStorage.getItem("ma-update-hidden")); } catch { /* sin almacenamiento: se muestra siempre */ }
    return d.onUpdateState(setState);
  }, []);

  if (!present || !state) return null;
  const d = desk()!;
  const later = () => {
    setHidden(state.version);
    try { sessionStorage.setItem("ma-update-hidden", state.version ?? ""); } catch { /* ignorar */ }
  };

  if (state.status === "available" && hidden !== state.version) {
    return (
      <div role="status" className="flex flex-wrap items-center gap-3 px-4 lg:px-6 py-3 bg-surface-raised border-b border-accent text-sm">
        <span className="min-w-0 wrap-anywhere">Hay una versión nueva de MenteActiva Plagio 0 ({state.version}). Tus datos se conservan.</span>
        {state.notes ? <details className="text-text-muted"><summary className="cursor-pointer">Qué trae</summary><p className="whitespace-pre-wrap mt-1 max-w-prose">{state.notes}</p></details> : null}
        <span className="flex gap-2 ml-auto">
          <button className={buttonClass("primary", true)} onClick={() => d.downloadUpdate()}>Actualizar</button>
          <button className={buttonClass("ghost", true)} onClick={later}>Más tarde</button>
        </span>
      </div>
    );
  }
  if (state.status === "downloading") {
    return (
      <div role="status" className="flex items-center gap-3 px-4 lg:px-6 py-3 bg-surface-raised border-b border-border text-sm">
        <span>Descargando la versión {state.version}… {state.percent} %</span>
        <progress className="flex-1 max-w-xs accent-accent" max={100} value={state.percent} aria-label="Progreso de la descarga" />
      </div>
    );
  }
  if (state.status === "ready") {
    return (
      <div role="status" className="flex flex-wrap items-center gap-3 px-4 lg:px-6 py-3 bg-surface-raised border-b border-accent text-sm">
        <span>La versión {state.version} está lista. La aplicación se reiniciará y tus datos se conservan (se guarda una copia antes).</span>
        <button className={`${buttonClass("primary", true)} ml-auto`} onClick={() => d.installUpdate()}>Reiniciar y actualizar</button>
      </div>
    );
  }
  if (state.status === "error" && state.error) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 px-4 lg:px-6 py-3 bg-surface-raised border-b border-danger text-sm">
        <span className="min-w-0 wrap-anywhere">No se pudo comprobar o descargar la actualización: {state.error}</span>
        <button className={`${buttonClass("secondary", true)} ml-auto`} onClick={() => d.checkForUpdates()}>Reintentar</button>
      </div>
    );
  }
  return null;
}

/** Línea pequeña en el menú lateral: versión y botón para comprobar a mano. */
export function VersionLine() {
  const [state, setState] = useState<UpdateState | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    const d = desk();
    if (!d) return;
    setVersion(d.version);
    d.getUpdateState().then(setState).catch(() => {});
    return d.onUpdateState(setState);
  }, []);

  if (!version) return null;
  const checking = state?.status === "checking";
  const msg = checking ? "Buscando…" : state?.status === "none" ? "Estás al día" : state?.status === "available" ? `Disponible ${state.version}` : null;
  return (
    <div className="mt-8 pt-4 border-t border-border text-xs text-text-muted">
      <p>Versión {version}</p>
      <button className="underline mt-1 disabled:no-underline" disabled={checking} onClick={() => desk()?.checkForUpdates()}>Buscar actualizaciones</button>
      {msg ? <p role="status" className="mt-1">{msg}</p> : null}
    </div>
  );
}

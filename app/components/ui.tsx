// Primitivas de interfaz. Solo clases de tokens (bg-surface, text-text-muted…), nunca colores sueltos.
import Link from "next/link";
import type { ReactNode } from "react";
import { simBand, type SimBand } from "@/lib/types";
import { SPECIALTY } from "@/lib/brand";
import { formatPercent } from "@/lib/format";

const base =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-transparent text-sm font-medium transition-colors duration-fast ease-brand disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";
const variants = {
  primary: "bg-accent text-accent-on shadow-glow hover:bg-accent-hover active:bg-accent-pressed",
  secondary: "border-border-input text-text hover:bg-surface-raised",
  ghost: "text-text hover:bg-surface",
  danger: "bg-danger text-danger-on",
} as const;
type Variant = keyof typeof variants;

export function buttonClass(variant: Variant = "primary", small = false) {
  return `${base} ${variants[variant]} ${small ? "h-8 px-3" : ""}`;
}

export function ButtonLink({
  href, variant = "primary", small, children,
}: { href: string; variant?: Variant; small?: boolean; children: ReactNode }) {
  return <Link href={href} className={buttonClass(variant, small)}>{children}</Link>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-surface border border-border rounded-lg p-6 ${className}`}>{children}</div>;
}

export function Wordmark({ className = "", big = false }: { className?: string; big?: boolean }) {
  return (
    <span className={`inline-flex flex-col leading-none ${big ? "items-center" : ""}`}>
      <span className={`font-display font-bold text-lg tracking-tight ${className}`}>
        Mente<b className="text-accent-text font-bold">Activa</b>
      </span>
      {/* especialidad del producto: pequeña, bajo el logo; el nombre paraguas no cambia */}
      <span className={`font-medium uppercase tracking-[0.3em] text-text-muted ${big ? "text-xs mt-2" : "text-[11px] mt-1"}`}>
        {SPECIALTY}
      </span>
    </span>
  );
}

export function PageHead({
  title, crumbs, actions, id,
}: { title: string; crumbs?: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        {crumbs ? <div className="text-sm text-text-muted mb-2">{crumbs}</div> : null}
        <h1 id={id} className="font-display font-bold text-2xl leading-tight wrap-anywhere">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

const simClass: Record<SimBand, string> = {
  none: "bg-sim-none text-sim-on",
  low: "bg-sim-low text-sim-on",
  mid: "bg-sim-mid text-sim-on",
  high: "bg-sim-high text-sim-on",
};
const simWord: Record<SimBand, string> = { none: "Sin coincidencias", low: "Similitud baja", mid: "Similitud media", high: "Similitud alta" };

export function SimBadge({ score, big = false }: { score: number; big?: boolean }) {
  const band = simBand(score);
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${simClass[band]} ${
        big ? "font-display font-bold text-xl px-4 py-2" : "text-sm px-2.5 py-1"
      }`}
      aria-label={`${simWord[band]}, ${formatPercent(score)}`}
    >
      {formatPercent(score)}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="text-xs border border-border-input rounded-sm px-1.5 py-0.5 text-text-muted whitespace-nowrap">{children}</span>;
}

export function Alert({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" }) {
  const border = tone === "error" ? "border-l-danger" : tone === "success" ? "border-l-success" : "border-l-accent";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex gap-3 items-start p-3 px-4 mb-4 text-sm bg-surface-raised border border-border border-l-4 ${border} rounded-md`}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title, text, action,
}: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="text-center bg-surface border border-border rounded-lg px-6 py-12">
      {/* red de conexiones propia de MenteActiva; decorativa */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/network-pattern.svg" alt="" className="mx-auto w-full max-w-xs opacity-90" />
      <h2 className="font-display font-bold text-lg mt-3 mb-1">{title}</h2>
      <p className="text-text-muted mb-4 max-w-md mx-auto">{text}</p>
      {action}
    </div>
  );
}

const inputBase =
  "w-full h-10 bg-surface text-text border border-border-input rounded-md px-3 text-base placeholder:text-text-muted focus-visible:border-accent-text";

export function Field({
  id, label, help, error, children,
}: { id: string; label: string; help?: string; error?: string | null; children: ReactNode }) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm mb-1">{label}</label>
      {children}
      {help ? <p id={`${id}-help`} className="text-xs text-text-muted mt-1">{help}</p> : null}
      {error ? <p className="text-xs text-danger mt-1">{error}</p> : null}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full bg-surface text-text border border-border-input rounded-md p-3 text-base placeholder:text-text-muted focus-visible:border-accent-text ${props.className ?? ""}`}
    />
  );
}

export function Check({
  id, name, label, defaultChecked, help,
}: { id: string; name: string; label: string; defaultChecked?: boolean; help?: string }) {
  return (
    <div className="flex items-start gap-3 mb-3">
      <input id={id} name={name} type="checkbox" defaultChecked={defaultChecked} className="mt-1 size-4 accent-accent" />
      <div>
        <label htmlFor={id} className="text-sm">{label}</label>
        {help ? <p className="text-xs text-text-muted">{help}</p> : null}
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

const tz = "Europe/Madrid";

export function formatDate(iso: string | null, withTime = false): string {
  if (!iso) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric", month: "short", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}), timeZone: tz,
  }).format(new Date(iso));
}

export function formatDateLong(iso: string | null): string {
  if (!iso) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: tz,
  }).format(new Date(iso));
}

export function formatPercent(n: number): string {
  return `${n.toLocaleString("es-ES", { maximumFractionDigits: 1 })} %`;
}

/** Convierte "2026-11-13T23:59" (hora local de Madrid) a ISO UTC. */
export function madridLocalToIso(local: string): string | null {
  if (!local) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offset = tzOffsetMinutes(new Date(guess));
  const iso = new Date(guess - offset * 60000);
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

function tzOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

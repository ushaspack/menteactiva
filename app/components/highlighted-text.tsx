import type { ReportMatch, ReportSource } from "@/lib/types";

// Clases completas (no construidas con plantillas) para que Tailwind las detecte.
export const MATCH_BG = [
  "", "bg-match-1", "bg-match-2", "bg-match-3", "bg-match-4", "bg-match-5", "bg-match-6", "bg-match-7", "bg-match-8",
];
export const MATCH_BADGE = [
  "", "bg-match-1-badge", "bg-match-2-badge", "bg-match-3-badge", "bg-match-4-badge",
  "bg-match-5-badge", "bg-match-6-badge", "bg-match-7-badge", "bg-match-8-badge",
];

/** Texto del trabajo con los tramos coincidentes resaltados y numerados por fuente. */
export function HighlightedText({
  text, matches, sources,
}: { text: string; matches: ReportMatch[]; sources: ReportSource[] }) {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    const src = byId.get(m.sourceId);
    if (!src || m.startChar < cursor) return;
    if (m.startChar > cursor) parts.push(text.slice(cursor, m.startChar));
    parts.push(
      <mark
        key={`${m.sourceId}-${i}`}
        className={`${MATCH_BG[src.colorIdx]} text-text rounded-sm px-0.5`}
        aria-label={`Coincidencia con la fuente ${src.colorIdx}`}
      >
        {text.slice(m.startChar, m.endChar)}
        <sup className={`${MATCH_BADGE[src.colorIdx]} text-sim-on text-[10px] font-medium px-1 py-px ml-0.5 rounded-full`}>
          {src.colorIdx}
        </sup>
      </mark>,
    );
    cursor = m.endChar;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <div className="max-w-reader leading-[1.75] whitespace-pre-wrap wrap-anywhere">{parts}</div>;
}

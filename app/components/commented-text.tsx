import type { FeedbackComment } from "@/lib/types";

/** Texto del trabajo con los fragmentos comentados marcados y numerados.
 *  El número se dibuja con CSS (data-n) para que el texto del contenedor sea exactamente el del trabajo:
 *  así las posiciones de la selección coinciden con las guardadas. */
export function CommentedText({ text, comments, id = "texto-trabajo" }: { text: string; comments: FeedbackComment[]; id?: string }) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  comments.forEach((c, i) => {
    if (c.start < cursor || c.end > text.length) return;
    if (c.start > cursor) parts.push(text.slice(cursor, c.start));
    parts.push(
      <mark
        key={c.id}
        id={`c-${c.id}`}
        data-n={i + 1}
        aria-label={`Fragmento con el comentario ${i + 1}`}
        className="bg-comment text-text rounded-sm px-0.5 scroll-mt-24 after:content-[attr(data-n)] after:align-super after:text-[10px] after:font-medium after:ml-0.5 after:px-1 after:py-px after:rounded-full after:bg-comment-badge after:text-comment-on"
      >
        {text.slice(c.start, c.end)}
      </mark>,
    );
    cursor = c.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return (
    <div id={id} className="max-w-reader leading-[1.75] whitespace-pre-wrap wrap-anywhere">
      {parts}
    </div>
  );
}

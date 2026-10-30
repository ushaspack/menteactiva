"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addCommentAction } from "@/app/actions";
import { emptyState } from "@/lib/form-state";
import { Alert, buttonClass, TextArea } from "./ui";

interface Picked { start: number; end: number; quote: string }

/** Envuelve el texto del trabajo: al seleccionar un fragmento (ratón, táctil o Mayús+flechas)
 *  aparece el formulario para comentarlo. */
export function SelectionComposer({ submissionId, children }: { submissionId: string; children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [state, action, pending] = useActionState(addCommentAction, emptyState);

  useEffect(() => {
    const onChange = () => {
      const sel = window.getSelection();
      const box = root.current?.querySelector<HTMLElement>("[data-text-root]");
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !box) return;
      const range = sel.getRangeAt(0);
      if (!box.contains(range.startContainer) || !box.contains(range.endContainer)) return;
      const offset = (node: Node, off: number) => {
        const r = document.createRange();
        r.selectNodeContents(box);
        r.setEnd(node, off);
        return r.toString().length;
      };
      const full = box.textContent ?? "";
      let start = offset(range.startContainer, range.startOffset);
      let end = offset(range.endContainer, range.endOffset);
      while (start < end && /\s/.test(full[start])) start++;
      while (end > start && /\s/.test(full[end - 1])) end--;
      if (start >= end) return;
      setPicked({ start, end, quote: full.slice(start, end) });
    };
    document.addEventListener("selectionchange", onChange);
    return () => document.removeEventListener("selectionchange", onChange);
  }, []);

  // tras añadir el comentario se limpia la selección
  useEffect(() => {
    if (state.ok) {
      setPicked(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [state]);

  return (
    <div ref={root}>
      <div data-text-root>{children}</div>
      <div className="sticky bottom-4 mt-6">
        {picked ? (
          <form action={action} className="bg-surface-raised border border-border-input rounded-lg p-4 shadow-glow" aria-label="Añadir comentario">
            <input type="hidden" name="submissionId" value={submissionId} />
            <input type="hidden" name="start" value={picked.start} />
            <input type="hidden" name="end" value={picked.end} />
            {state.error ? <Alert tone="error">{state.error}</Alert> : null}
            <p className="text-xs text-text-muted mb-2">Comentas este fragmento:</p>
            <blockquote className="text-sm border-l-2 border-accent pl-3 mb-3 line-clamp-3 wrap-anywhere">{picked.quote}</blockquote>
            <label htmlFor="comment-text" className="block text-sm mb-1">Tu comentario</label>
            <TextArea id="comment-text" name="text" rows={3} maxLength={2000} required defaultValue={state.values.text ?? ""} />
            <div className="flex gap-2 mt-3">
              <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass("primary", true)}>Añadir comentario</button>
              <button type="button" className={buttonClass("ghost", true)} onClick={() => setPicked(null)}>Cancelar</button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-text-muted">Selecciona un fragmento del texto para comentarlo.</p>
        )}
      </div>
    </div>
  );
}

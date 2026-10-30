// Motor de similitud: winnowing sobre n-gramas de palabras (ver architecture.md, sección 3).
// Código propio. Puro y sin dependencias: la versión con Postgres sustituirá solo la búsqueda de candidatos.

import type { CorpusDoc, ReportMatch, ReportSettings, ReportSource } from "./types";

export const K = 5; // palabras por n-grama
export const W = 4; // ventana de winnowing
const MAX_SOURCES = 8; // colores disponibles

interface Token {
  norm: string;
  start: number;
  end: number;
}

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  const re = /[\p{L}\p{N}][\p{L}\p{N}'’]*/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const norm = m[0].toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
    out.push({ norm, start: m.index, end: m.index + m[0].length });
  }
  return out;
}

// FNV-1a de 64 bits
function hash64(s: string): bigint {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < s.length; i++) {
    h ^= BigInt(s.charCodeAt(i));
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return h;
}

/** Huellas por winnowing: mapa hash → posiciones (índice del primer token del n-grama). */
export function fingerprints(tokens: Token[]): Map<string, number[]> {
  const result = new Map<string, number[]>();
  if (tokens.length < K) return result;
  const hashes: bigint[] = [];
  for (let i = 0; i + K <= tokens.length; i++) {
    hashes.push(hash64(tokens.slice(i, i + K).map((t) => t.norm).join(" ")));
  }
  const w = Math.min(W, hashes.length);
  let lastPos = -1;
  for (let i = 0; i + w <= hashes.length; i++) {
    let minIdx = i;
    for (let j = i; j < i + w; j++) if (hashes[j] <= hashes[minIdx]) minIdx = j; // el más a la derecha
    if (minIdx !== lastPos) {
      const key = hashes[minIdx].toString();
      const list = result.get(key);
      if (list) list.push(minIdx);
      else result.set(key, [minIdx]);
      lastPos = minIdx;
    }
  }
  return result;
}

export function countWords(text: string): number {
  return tokenize(text).length;
}

type Range = [number, number]; // [inicio, fin) en índices de token

function mergeRanges(ranges: Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out: Range[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else out.push([r[0], r[1]]);
  }
  return out;
}

/** Índices de token que quedan fuera por citas textuales o bibliografía. */
function excludedTokenSet(text: string, tokens: Token[], s: ReportSettings): Set<number> {
  const skip = new Set<number>();
  const charRanges: Range[] = [];

  if (s.excludeQuotes) {
    const re = /["“«]([^"”»]{12,}?)["”»]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) charRanges.push([m.index, m.index + m[0].length]);
  }
  if (s.excludeBibliography) {
    const re = /^\s*(bibliograf[ií]a|referencias(?: bibliogr[aá]ficas)?|bibliography|references)\s*:?\s*$/gim;
    const m = re.exec(text);
    if (m) charRanges.push([m.index, text.length]);
  }
  if (charRanges.length === 0) return skip;
  tokens.forEach((t, i) => {
    if (charRanges.some(([a, b]) => t.start >= a && t.end <= b)) skip.add(i);
  });
  return skip;
}

export interface EngineResult {
  score: number;
  sources: ReportSource[];
  matches: ReportMatch[];
}

/**
 * Compara un texto con el corpus y devuelve puntuación, fuentes y tramos.
 * `corpus` ya viene filtrado por ámbito (institución / plataforma) y sin el propio trabajo.
 */
export function compare(text: string, corpus: CorpusDoc[], settings: ReportSettings): EngineResult {
  const tokens = tokenize(text);
  const total = tokens.length;
  if (total < K) return { score: 0, sources: [], matches: [] };

  const mine = fingerprints(tokens);
  const skip = excludedTokenSet(text, tokens, settings);

  // 1) por documento: tramos de tokens coincidentes
  interface Candidate { doc: CorpusDoc; shared: number; ranges: Range[] }
  const candidates: Candidate[] = [];
  for (const doc of corpus) {
    const theirTokens = tokenize(doc.text);
    const theirs = fingerprints(theirTokens);
    let shared = 0;
    const ranges: Range[] = [];
    for (const [h, positions] of mine) {
      const theirPositions = theirs.get(h);
      if (!theirPositions) continue;
      shared++;
      for (const p of positions) {
        for (const q of theirPositions) {
          // el winnowing solo marca puntos dentro del tramo: se extiende a ambos lados mientras el texto coincida
          let left = 0;
          while (p - left - 1 >= 0 && q - left - 1 >= 0 && tokens[p - left - 1].norm === theirTokens[q - left - 1].norm) left++;
          let right = 0;
          while (p + K + right < tokens.length && q + K + right < theirTokens.length && tokens[p + K + right].norm === theirTokens[q + K + right].norm) right++;
          ranges.push([p - left, p + K + right]);
        }
      }
    }
    if (shared > 0) candidates.push({ doc, shared, ranges: mergeRanges(ranges) });
  }
  candidates.sort((a, b) => b.shared - a.shared);

  // 2) atribución: cada token cuenta una sola vez, para la fuente con más coincidencias
  const taken = new Set<number>();
  const sources: ReportSource[] = [];
  const spansBySource = new Map<string, Range[]>();
  let colorIdx = 0;

  for (const c of candidates) {
    if (colorIdx >= MAX_SOURCES) break;
    const excludedSource = settings.excludedSourceIds.includes(c.doc.id);
    const kept: Range[] = [];
    for (const [a, b] of c.ranges) {
      // recorta lo ya atribuido y lo excluido por citas/bibliografía
      let start = -1;
      for (let i = a; i <= b; i++) {
        const free = i < b && !taken.has(i) && !skip.has(i);
        if (free && start === -1) start = i;
        if (!free && start !== -1) {
          if (i - start >= settings.excludeBelowWords && i - start > 0) kept.push([start, i]);
          start = -1;
        }
      }
    }
    if (kept.length === 0) continue;
    colorIdx++;
    if (!excludedSource) kept.forEach(([a, b]) => { for (let i = a; i < b; i++) taken.add(i); });
    const covered = kept.reduce((n, [a, b]) => n + (b - a), 0);
    sources.push({
      id: c.doc.id,
      kind: c.doc.kind,
      title: c.doc.title,
      url: c.doc.url,
      percent: round1((covered / total) * 100),
      colorIdx,
      excluded: excludedSource,
    });
    spansBySource.set(c.doc.id, kept);
  }

  // 3) tramos en caracteres (solo fuentes no excluidas) y puntuación
  const matches: ReportMatch[] = [];
  let coveredTokens = 0;
  for (const s of sources) {
    if (s.excluded) continue;
    for (const [a, b] of spansBySource.get(s.id)!) {
      matches.push({ sourceId: s.id, startChar: tokens[a].start, endChar: tokens[b - 1].end });
      coveredTokens += b - a;
    }
  }
  matches.sort((x, y) => x.startChar - y.startChar);

  return { score: round1(Math.min(100, (coveredTokens / total) * 100)), sources, matches };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

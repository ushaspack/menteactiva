// Extracción de texto de las entregas: .txt, .docx y .pdf. Se valida el contenido real (no solo la extensión).
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export type Extracted = { ok: true; text: string } | { ok: false; error: string };

const startsWith = (b: Uint8Array, sig: number[]) => sig.every((x, i) => b[i] === x);

export async function extractFromFile(name: string, bytes: Uint8Array): Promise<Extracted> {
  const lower = name.toLowerCase();
  try {
    if (lower.endsWith(".txt")) {
      if (bytes.includes(0)) return { ok: false, error: "El archivo .txt parece binario. Guárdalo como texto plano." };
      return { ok: true, text: new TextDecoder("utf-8").decode(bytes) };
    }
    if (lower.endsWith(".docx")) {
      if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return { ok: false, error: "Este archivo no es un .docx válido." };
      const r = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      return { ok: true, text: r.value };
    }
    if (lower.endsWith(".pdf")) {
      if (!startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return { ok: false, error: "Este archivo no es un PDF válido." };
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const { text } = await extractText(pdf, { mergePages: true });
      if (!text.trim()) {
        return { ok: false, error: "No encontramos texto en este PDF. Si es un escaneo, necesita reconocimiento de texto (OCR) antes de entregarlo." };
      }
      return { ok: true, text };
    }
  } catch {
    return { ok: false, error: "No pudimos leer el archivo. Comprueba que no esté dañado o protegido con contraseña." };
  }
  return { ok: false, error: "Solo se aceptan archivos .txt, .docx o .pdf, o texto pegado." };
}

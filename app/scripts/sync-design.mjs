// Copia los tokens, las fuentes y el mapeo de Tailwind desde ../design (fuente única).
import { cpSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const design = join(root, "..", "design");

mkdirSync(join(root, "app", "design"), { recursive: true });
copyFileSync(join(design, "tokens.css"), join(root, "app", "design", "tokens.css"));
cpSync(join(design, "fonts"), join(root, "app", "design", "fonts"), { recursive: true });
copyFileSync(join(design, "tailwind.config.ts"), join(root, "tailwind.config.ts"));
console.log("diseño sincronizado");

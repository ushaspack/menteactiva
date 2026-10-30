// Solo para la app de escritorio: la ventana pide guardar los datos antes de cerrar (en Windows no hay señales de cierre).
import { flush } from "@/lib/persist";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = process.env.MENTEACTIVA_DESKTOP_TOKEN;
  if (!token || req.headers.get("x-desktop-token") !== token) return new Response("No autorizado", { status: 403 });
  flush();
  return new Response("ok");
}

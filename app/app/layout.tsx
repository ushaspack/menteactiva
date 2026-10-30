import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BRAND, SPECIALTY } from "@/lib/brand";

export const metadata: Metadata = {
  title: { default: `${BRAND} · ${SPECIALTY}`, template: `%s · ${BRAND} ${SPECIALTY}` },
  description: "Entrega de trabajos, informe de similitud y feedback.",
};
export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}

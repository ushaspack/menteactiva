import type { NextConfig } from "next";

const config: NextConfig = {
  // salida autónoma: la app de escritorio la lleva dentro, sin node_modules completo
  output: "standalone",
  experimental: {
    // las entregas pueden pesar hasta 50 MB
    serverActions: { bodySizeLimit: "50mb" },
  },
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "same-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
};

export default config;

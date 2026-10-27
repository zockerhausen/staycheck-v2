import type { NextConfig } from "next";

// Sicherheits-Header für alle Seiten
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://tiles.openfreemap.org",
      "font-src 'self' data:",
      "connect-src 'self' https://yxwnkvvhwlnsvnjdxdle.supabase.co https://tiles.openfreemap.org",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,
  // Vorberechnete Städte mit ausliefern (werden zur Laufzeit gelesen)
  outputFileTracingIncludes: { "/**/*": ["./data/cities/**/*", "./data/insights/**/*"] },
  // Schon besuchte Seiten 30 Sek. im Browser behalten: Zurück und Vor gehen sofort
  // (Änderungen über Server-Aktionen, z. B. Quiz, leeren diesen Speicher automatisch)
  experimental: {
    staleTimes: { dynamic: 30, static: 180 },
    // Nicht verkleinern: der Zwischenspeicher (unstable_cache) nutzt den Funktionstext als Schlüssel.
    // Verkleinert ändert er sich bei jedem Update, und alle vorberechneten Städte wären wieder leer.
    serverMinification: false,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

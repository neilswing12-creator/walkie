import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";
const mapStyleOrigin = (() => { try { return process.env.NEXT_PUBLIC_MAP_STYLE_URL ? new URL(process.env.NEXT_PUBLIC_MAP_STYLE_URL).origin : ""; } catch { return ""; } })();
/** CSP: scripts only from us + the map SDKs the admin can enable; no plugins, no framing, no foreign form posts. */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://maps.googleapis.com https://maps.gstatic.com https://cdn.apple-mapkit.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self'${dev ? " ws: http://localhost:*" : ""} https://maps.googleapis.com https://*.googleapis.com https://*.gstatic.com https://*.apple-mapkit.com https://*.ls.apple.com https://api.maptiler.com https://tiles.openfreemap.org ${mapStyleOrigin}`.trim(),
  "worker-src 'self' blob:",
  "child-src blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { formats: ["image/avif", "image/webp"] },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/(app|admin|api)/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;

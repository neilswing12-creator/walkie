import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/app/", "/admin", "/admin/", "/api/", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/welcome", "/s/", "/b/"] }],
    sitemap: "https://walkie.run/sitemap.xml",
    host: "https://walkie.run",
  };
}

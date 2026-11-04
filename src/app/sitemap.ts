import type { MetadataRoute } from "next";
const BASE = "https://walkie.run";
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [["", 1, "weekly"], ["/features", 0.8, "monthly"], ["/about", 0.6, "monthly"], ["/help", 0.6, "monthly"], ["/blog", 0.5, "weekly"], ["/contact", 0.4, "yearly"], ["/privacy", 0.3, "yearly"], ["/terms", 0.3, "yearly"], ["/cookies", 0.2, "yearly"]].map(
    ([path, priority, changeFrequency]) => ({ url: `${BASE}${path}`, lastModified: now, priority: priority as number, changeFrequency: changeFrequency as "weekly" }),
  );
}

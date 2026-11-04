export { formatDistance, formatDuration, formatPace } from "./fitness";
export const num = (n: number) => Math.round(n).toLocaleString("en-US");
export const km = (m: number, digits = 1) => (m / 1000).toFixed(digits);
export const dist = (m: number, units: "metric" | "imperial" = "metric", digits = 1) => units === "imperial" ? `${(m / 1609.344).toFixed(digits)}` : `${(m / 1000).toFixed(digits)}`;
export const distUnit = (units: "metric" | "imperial" = "metric") => (units === "imperial" ? "mi" : "km");
export const dayLetter = (date: string) => ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][new Date(date + "T12:00:00Z").getUTCDay()];
export const shortDate = (d: string | Date) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export function timeAgo(d: string | Date) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Date helpers that operate in a user's IANA timezone without external deps. */

export function dateKey(d: Date = new Date(), tz = "UTC"): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  const pa = Date.UTC(...(a.split("-").map(Number) as [number, number, number]).map((v, i) => (i === 1 ? v - 1 : v)) as [number, number, number]);
  const pb = Date.UTC(...(b.split("-").map(Number) as [number, number, number]).map((v, i) => (i === 1 ? v - 1 : v)) as [number, number, number]);
  return Math.round((pb - pa) / 86400000);
}

/** ISO week key, e.g. 2026-W45 */
export function weekKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Monday-start week containing key → 7 date keys */
export function weekDays(key: string): string[] {
  const [y, m, d] = key.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = addDays(key, mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function lastNDays(key: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(key, i - n + 1));
}

export function hourIn(tz: string, d = new Date()): number {
  try {
    return Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(d)) % 24;
  } catch {
    return d.getUTCHours();
  }
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Privacy trim for shared routes: hides the start and finish (usually home or work).
 * The hidden radius is 150 m, but never more than 20 % of the route's length, so short walks still show a route
 * while the exact start/finish stays hidden. Used by the share image and the public share page.
 */
type P = [number, number, ...unknown[]];
const metres = (a: P, b: P) => {
  const R = 6371000, r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
export function routeLength(pts: P[]) { let m = 0; for (let i = 1; i < pts.length; i++) m += metres(pts[i - 1], pts[i]); return m; }
export function privacyTrim<T extends P>(pts: T[], maxM = 150, maxShare = 0.2): T[] {
  if (pts.length < 3) return [];
  const radius = Math.min(maxM, routeLength(pts) * maxShare);
  const s = pts[0], e = pts[pts.length - 1];
  const kept = pts.filter((p) => metres(p, s) > radius && metres(p, e) > radius);
  return kept.length >= 2 ? kept : pts.slice(1, -1).length >= 2 ? pts.slice(1, -1) : [];
}

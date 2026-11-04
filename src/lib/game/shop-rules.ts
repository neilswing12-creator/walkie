/** Pure placement rules — shared by client preview and server validation (and unit-tested). */
export const gridSize = (expansion: number) => 8 + expansion * 2;

export interface Placed { id?: string; x: number; z: number; rotation: number; w: number; d: number }

export function footprint(w: number, d: number, rotation: number) {
  return rotation % 2 === 1 ? { w: d, d: w } : { w, d };
}

export function cells(p: Placed): string[] {
  const f = footprint(p.w, p.d, p.rotation);
  const out: string[] = [];
  for (let i = 0; i < f.w; i++) for (let j = 0; j < f.d; j++) out.push(`${p.x + i},${p.z + j}`);
  return out;
}

export function validatePlacement(candidate: Placed, others: Placed[], expansion: number): { ok: true } | { ok: false; reason: string } {
  const size = gridSize(expansion);
  if (![0, 1, 2, 3].includes(candidate.rotation)) return { ok: false, reason: "Invalid rotation" };
  const f = footprint(candidate.w, candidate.d, candidate.rotation);
  if (!Number.isInteger(candidate.x) || !Number.isInteger(candidate.z)) return { ok: false, reason: "Invalid position" };
  if (candidate.x < 0 || candidate.z < 0 || candidate.x + f.w > size || candidate.z + f.d > size) return { ok: false, reason: "That spot is outside your shop — expand to unlock more space" };
  const taken = new Set(others.filter((o) => o.id !== candidate.id).flatMap(cells));
  if (cells(candidate).some((c) => taken.has(c))) return { ok: false, reason: "Something is already there" };
  return { ok: true };
}

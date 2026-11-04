import type { Tx } from "../db";
import { addDays, diffDays } from "../dates";

/** Marks a day active. Uses a streak freeze automatically to bridge a single missed day. */
export async function markActiveDay(tx: Tx, userId: string, today: string) {
  const s = await tx.streak.upsert({ where: { userId }, create: { userId }, update: {} });
  if (s.lastActiveDate === today) return { current: s.current, extended: false, usedFreeze: false };
  let current = 1;
  let usedFreeze = false;
  if (s.lastActiveDate) {
    const gap = diffDays(s.lastActiveDate, today);
    if (gap === 1) current = s.current + 1;
    else if (gap === 2) {
      const w = await tx.wallet.updateMany({ where: { userId, streakFreezes: { gte: 1 } }, data: { streakFreezes: { decrement: 1 } } });
      if (w.count === 1) {
        current = s.current + 1;
        usedFreeze = true;
      }
    } else if (gap < 0) return { current: s.current, extended: false, usedFreeze: false }; // back-dated sync
  }
  await tx.streak.update({ where: { userId }, data: { current, longest: Math.max(s.longest, current), lastActiveDate: today, freezesUsed: usedFreeze ? { increment: 1 } : undefined } });
  return { current, extended: true, usedFreeze };
}

/** Streak as displayed today — a streak is still "alive" if yesterday was active. */
export function displayStreak(s: { current: number; lastActiveDate: string | null } | null, today: string) {
  if (!s?.lastActiveDate) return { current: 0, activeToday: false };
  if (s.lastActiveDate === today) return { current: s.current, activeToday: true };
  if (s.lastActiveDate === addDays(today, -1)) return { current: s.current, activeToday: false };
  return { current: 0, activeToday: false };
}

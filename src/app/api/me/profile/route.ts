import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { isValidTimezone } from "@/lib/dates";

const vis = z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]);
const schema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, "Usernames are 3–20 letters, numbers or _").nullable().optional(),
  timezone: z.string().refine(isValidTimezone, "Unknown timezone").optional(),
  bio: z.string().max(160).nullable().optional(),
  weightKg: z.number().min(25).max(300).nullable().optional(),
  heightCm: z.number().min(100).max(230).nullable().optional(),
  units: z.enum(["metric", "imperial"]).optional(),
  dailyStepGoal: z.number().int().min(1000).max(50000).optional(),
  dailyDistanceGoalM: z.number().int().min(500).max(50000).optional(),
  dailyActiveMinGoal: z.number().int().min(5).max(300).optional(),
  profileVisibility: vis.optional(),
  activityVisibility: vis.optional(),
  shareRoutes: z.boolean().optional(),
  leaderboardOptIn: z.boolean().optional(),
  allowFriendRequests: z.boolean().optional(),
  notifyDailyReminder: z.boolean().optional(),
  notifyMissions: z.boolean().optional(),
  notifyPets: z.boolean().optional(),
  notifyFriends: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
  reminderHour: z.number().int().min(0).max(23).optional(),
  onboarded: z.boolean().optional(),
  preferredActivity: z.enum(["walk", "run", "bike", "mixed"]).nullable().optional(),
  fitnessGoals: z.array(z.enum(["habit", "fitness", "running", "outdoors", "daily", "pets"])).max(6).nullable().optional(),
  activityLevel: z.enum(["starting", "occasional", "regular", "very"]).nullable().optional(),
  publicName: z.string().trim().min(2).max(24).regex(/^[\p{L}\p{N} ._'\-]+$/u, "Letters, numbers and spaces only").nullable().optional(),
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).refine((c) => { try { return new Intl.DisplayNames(["en"], { type: "region" }).of(c) !== c; } catch { return false; } }, "Unknown country").nullable().optional(),
  community: z.string().trim().min(2).max(40).regex(/^[\p{L}\p{N} .,'&\-]+$/u).transform((c) => c.toLowerCase().replace(/\s+/g, " ")).nullable().optional(),
  showPhotoOnBoards: z.boolean().optional(),
  notifyCompetition: z.boolean().optional(),
  petNickname: z.string().trim().min(1).max(24).regex(/^[\p{L}\p{N} '\-]+$/u).optional(),
});

export const PATCH = handler(async ({ req, user }) => {
  const { name, username, timezone, onboarded, petNickname, fitnessGoals, ...profile } = await body(req, schema);
  if (petNickname) { const p = await db.profile.findUnique({ where: { userId: user.id } }); if (p?.activePetId) await db.pet.updateMany({ where: { id: p.activePetId, userId: user.id }, data: { nickname: petNickname } }); }
  if (username) {
    const taken = await db.user.findFirst({ where: { username, NOT: { id: user.id } } });
    if (taken) throw new ApiError(409, "That username is taken", "username_taken");
  }
  await db.user.update({ where: { id: user.id }, data: { name, username, timezone } });
  const updated = await db.profile.update({ where: { userId: user.id }, data: { ...profile, ...(fitnessGoals !== undefined ? { fitnessGoals: fitnessGoals ?? undefined } : {}), ...(onboarded ? { onboardedAt: new Date() } : {}) } });
  if (onboarded) await (await import("@/lib/referrals/service")).processReferral(user.id).catch(() => {});
  return ok(updated);
});

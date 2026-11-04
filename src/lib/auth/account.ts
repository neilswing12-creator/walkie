import "server-only";
import { db } from "../db";
import { randomToken, sha256 } from "./crypto";
import { sendEmail, emails } from "../email";
import { env } from "../env";
import { setupNewUser } from "../game/setup";
import { getEconomy } from "../settings";

export async function createUserWithSetup(data: { email: string; name: string; passwordHash?: string; emailVerified?: Date | null; avatarUrl?: string; timezone?: string }) {
  const economy = await getEconomy();
  return db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: data.email.toLowerCase(), name: data.name, passwordHash: data.passwordHash, emailVerified: data.emailVerified ?? null, avatarUrl: data.avatarUrl, timezone: data.timezone ?? "UTC" } });
    await setupNewUser(tx, user.id, economy.starterCoins);
    return user;
  });
}

export async function issueToken(userId: string, type: "EMAIL_VERIFY" | "PASSWORD_RESET") {
  const token = randomToken(32);
  await db.verificationToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } }); // invalidate older tokens
  await db.verificationToken.create({ data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + (type === "PASSWORD_RESET" ? 3600000 : 3 * 86400000)) } });
  return token;
}

export async function consumeToken(token: string, type: "EMAIL_VERIFY" | "PASSWORD_RESET") {
  const row = await db.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) return null;
  const r = await db.verificationToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  return r.count === 1 ? row.userId : null;
}

export async function sendVerification(userId: string, email: string) {
  const token = await issueToken(userId, "EMAIL_VERIFY");
  const e = emails.verify(`${env.appUrl}/verify-email?token=${token}`);
  return sendEmail(email, e.subject, e.html, e.text);
}

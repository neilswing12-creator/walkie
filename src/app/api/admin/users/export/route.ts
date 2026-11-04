import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

/** CSV of account metadata only — no health, location or activity data. */
export const GET = handler(async ({ user }) => {
  const rows = await db.user.findMany({ orderBy: { createdAt: "asc" }, take: 50000, select: { id: true, email: true, name: true, role: true, status: true, createdAt: true, lastActiveAt: true, emailVerified: true } });
  const esc = (v: unknown) => { const s = v instanceof Date ? v.toISOString() : String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : /^[=+\-@]/.test(s) ? `'${s}` : s; };
  const csv = ["id,email,name,role,status,created_at,last_active_at,email_verified", ...rows.map((r) => [r.id, r.email, r.name, r.role, r.status, r.createdAt, r.lastActiveAt, !!r.emailVerified].map(esc).join(","))].join("\n");
  await audit(user.id, "users.export", "user", null, { count: rows.length });
  return new NextResponse(csv, { headers: { "content-type": "text/csv", "content-disposition": `attachment; filename="walkie-users-${new Date().toISOString().slice(0, 10)}.csv"` } });
}, { role: "ADMIN" });

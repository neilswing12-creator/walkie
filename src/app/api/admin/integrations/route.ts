import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { hasRole, requireReauth } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { securityEvent } from "@/lib/security-log";
import { FIELDS, REGISTRY, configMeta, configSource, encryptionReady, refreshConfig, seal, cfg } from "@/lib/integrations/config";
import { integrationStatus } from "@/lib/env";
import type { CurrentUser } from "@/lib/auth/session";

/** Status only — secret values never leave the server. Non-secret identifiers (client IDs, price IDs, hosts) are shown. */
async function view(user: CurrentUser) {
  await refreshConfig(true);
  return {
    canEdit: hasRole(user, "OWNER") && encryptionReady(),
    isOwner: hasRole(user, "OWNER"),
    encryptionReady: encryptionReady(),
    status: integrationStatus(),
    groups: REGISTRY.map((g) => ({
      id: g.id, title: g.title, help: g.help,
      fields: g.fields.map((f) => {
        const src = configSource(f.key), meta = configMeta(f.key);
        return {
          key: f.key, label: f.label, secret: f.secret, multiline: !!f.multiline, placeholder: f.placeholder ?? "",
          source: src, // "admin" | "env" | null
          value: f.secret ? null : cfg(f.key) ?? "",
          updatedAt: meta?.updatedAt ?? null,
          unreadable: meta ? !meta.ok : false, // stored but can't be decrypted (CONFIG_ENCRYPTION_KEY changed)
        };
      }),
    })),
  };
}

export const GET = handler(async ({ user }) => ok(await view(user)), { role: "ADMIN" });

const schema = z.object({
  confirmPassword: z.string().max(200).optional(),
  changes: z.record(z.string().max(64), z.string().max(12000).nullable()).refine((o) => Object.keys(o).length > 0 && Object.keys(o).length <= 40, "Nothing to change"),
});

export const PUT = handler(async ({ req, user }) => {
  const input = await body(req, schema);
  if (!encryptionReady()) throw new ApiError(503, "Set CONFIG_ENCRYPTION_KEY on the server first — keys are only stored encrypted", "encryption_unavailable");
  await requireReauth(user, input.confirmPassword); // step-up: password (or a sign-in in the last 15 min for OAuth-only owners)
  const set: string[] = [], cleared: string[] = [];
  const ops = [];
  for (const [key, raw] of Object.entries(input.changes)) {
    const f = FIELDS.get(key);
    if (!f) throw new ApiError(400, `${key} can't be set from the admin panel`, "not_editable");
    if (raw === null || raw.trim() === "") { cleared.push(key); ops.push(db.integrationSecret.deleteMany({ where: { key } })); continue; }
    const v = f.multiline ? raw.replace(/\r\n/g, "\n").trim() : raw.trim();
    if (!f.multiline && /[\r\n]/.test(v)) throw new ApiError(400, `${f.label}: must be a single line`, "validation");
    const problem = f.check?.(v);
    if (problem) throw new ApiError(400, `${f.label}: ${problem}`, "validation");
    set.push(key);
    const value = seal(v, key); // the key name is bound as AAD, so a row can't be copied onto another key
    ops.push(db.integrationSecret.upsert({ where: { key }, create: { key, value, updatedById: user.id }, update: { value, updatedById: user.id } }));
  }
  await db.$transaction(ops);
  await audit(user.id, "integrations.update", "integration", null, { set, cleared }); // names only, never values
  await securityEvent("integrations.changed", user.id, { set: set.length, cleared: cleared.length });
  return ok(await view(user));
}, { role: "OWNER", rate: { limit: 12, windowMs: 10 * 60000 } });

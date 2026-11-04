import { publicHandler, ok } from "@/lib/api";
import { issueInstallToken, verifyInstallToken } from "@/lib/referrals/signals";
/** Issues a server-signed install identifier. Clients can't mint their own; forged tokens are ignored. */
export const GET = publicHandler(async ({ req }) => {
  const existing = req.headers.get("x-walkie-install");
  return ok({ token: existing && verifyInstallToken(existing) ? existing : issueInstallToken() });
}, { rate: { limit: 30, windowMs: 3600000, key: "install-token" } });

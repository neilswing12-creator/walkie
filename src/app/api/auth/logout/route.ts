import { publicHandler, ok } from "@/lib/api";
import { destroySession } from "@/lib/auth/session";

export const POST = publicHandler(async () => {
  await destroySession();
  return ok({});
}, {});

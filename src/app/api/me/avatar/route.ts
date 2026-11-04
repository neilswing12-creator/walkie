import { handler, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { saveImageUpload } from "@/lib/uploads";

export const POST = handler(async ({ req, user }) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Choose an image");
  const url = await saveImageUpload(file, "avatars", 2 * 1024 * 1024);
  await db.user.update({ where: { id: user.id }, data: { avatarUrl: url } });
  return ok({ url });
}, { rate: { limit: 10, windowMs: 3600000, key: "avatar" } });

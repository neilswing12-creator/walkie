import { handler, ok, ApiError } from "@/lib/api";
import { saveImageUpload } from "@/lib/uploads";
import { audit } from "@/lib/audit";
export const POST = handler(async ({ req, user }) => {
  const form = await req.formData();
  const file = form.get("file");
  const folder = form.get("folder") === "items" ? "items" : "pets";
  if (!(file instanceof File)) throw new ApiError(400, "Choose an image");
  const url = await saveImageUpload(file, folder);
  await audit(user.id, "asset.upload", folder, null, { url });
  return ok({ url });
}, { role: "ADMIN", rate: { limit: 60, windowMs: 3600000 } });

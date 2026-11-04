/**
 * Secure image uploads: size limit, magic-byte sniffing (not the client MIME), random filenames.
 * Stores under public/uploads locally. For production, point UPLOAD_DIR at a persistent volume or swap
 * saveImageUpload() for S3/R2 — callers only depend on the returned URL.
 */
import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomToken } from "./auth/crypto";
import { ApiError } from "./api-error";

function sniff(buf: Buffer): "png" | "jpg" | "webp" | "gif" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.toString("ascii", 0, 3) === "GIF") return "gif";
  return null; // SVG deliberately rejected (can carry scripts)
}

export async function saveImageUpload(file: File, folder: "avatars" | "pets" | "items", maxBytes = 4 * 1024 * 1024) {
  if (file.size > maxBytes) throw new ApiError(413, `Images must be under ${Math.round(maxBytes / 1024 / 1024)} MB`);
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) throw new ApiError(415, "Upload a PNG, JPG, WebP or GIF image");
  const dir = path.join(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads"), folder);
  await mkdir(dir, { recursive: true });
  const name = `${randomToken(12)}.${ext}`;
  await writeFile(path.join(dir, name), buf);
  return `/uploads/${folder}/${name}`;
}

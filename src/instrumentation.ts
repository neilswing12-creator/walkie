/** Loads admin-set integration keys (decrypted into memory) before the first request is served. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { refreshConfig } = await import("./lib/integrations/config");
  await refreshConfig(true);
}

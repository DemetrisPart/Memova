/** Nest API origin without a trailing `/v1` (callers append `/v1/...`). */
export function getApiOrigin(): string {
  const raw = (process.env.API_URL ?? "http://localhost:3001").trim();
  return raw.replace(/\/+$/, "").replace(/\/v1$/i, "");
}

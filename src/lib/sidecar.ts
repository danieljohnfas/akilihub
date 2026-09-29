/**
 * The Python scraper sidecar requires a shared key (`SIDECAR_API_KEY`) on every endpoint
 * except /health. Merge these headers into every request made to it.
 */
export function sidecarHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const key = process.env.SIDECAR_API_KEY;
  return key ? { ...extra, 'X-Sidecar-Key': key } : extra;
}

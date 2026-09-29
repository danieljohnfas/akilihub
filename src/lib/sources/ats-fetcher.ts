import { sidecarHeaders } from '@/lib/sidecar';
import { safeFetch, readBodyLimited, type SafeFetchOptions } from "@/lib/security/safe-fetch";
export async function fetchAtsApi(url: string, method: string = "GET", headers?: Record<string, string>, body?: any) {
  const sidecarUrl = process.env.SCRAPLING_URL ?? process.env.SIDECAR_URL;

  // If sidecar is available, route through the stealth proxy
  if (sidecarUrl) {
    try {
      const res = await fetch(`${sidecarUrl}/proxy_api`, {
        method: "POST",
        headers: sidecarHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          url,
          method,
          headers,
          json_body: body
        })
      });

      if (res.ok) {
        const payload = await res.json();
        if (payload.success) {
          return payload.data;
        } else {
          console.warn(`[ATS Fetcher] Sidecar proxy failed with status ${payload.status_code}: ${payload.error}`);
        }
      }
    } catch (error) {
      console.warn(`[ATS Fetcher] Failed to reach sidecar at ${sidecarUrl}:`, error);
    }
  }

  // Fallback to direct fetch
  const options: RequestInit = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
    if (!options.headers) options.headers = {};
    options.headers = { ...options.headers, 'Content-Type': 'application/json' };
  }

  const res = await safeFetch(url, { ...(options as SafeFetchOptions), timeoutMs: 20_000 });
  if (!res.ok) {
    await res.body?.cancel().catch(() => undefined);
    throw new Error(`Direct fetch failed with status ${res.status}`);
  }
  return JSON.parse((await readBodyLimited(res, 10 * 1024 * 1024)).toString('utf8'));
}

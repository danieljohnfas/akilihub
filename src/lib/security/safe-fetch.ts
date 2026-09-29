import { lookup as dnsLookup } from 'dns';
import { Agent, fetch as undiciFetch, type RequestInit, type Response } from 'undici';
import { assertPublicHttpUrl, isPrivateIPv4, isPrivateIPv6 } from './safe-url';

/**
 * SSRF-hardened fetch for URLs that come from scraped/user-controlled data.
 *
 *  - Only http(s) without credentials, never private/loopback/link-local/metadata hosts.
 *  - The check happens on the *resolved address at connect time* (custom DNS lookup),
 *    so DNS rebinding cannot swap in an internal IP between check and use.
 *  - Redirects are followed manually and every hop is re-validated.
 *  - Response bodies are size-capped.
 */

function addressIsPrivate(address: string, family: number): boolean {
  if (family === 6 || address.includes(':')) return isPrivateIPv6(address);
  const m = address.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  return m ? isPrivateIPv4(Number(m[1]), Number(m[2]), Number(m[3])) : true;
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address?: string | Array<{ address: string; family: number }>, family?: number) => void;

function guardedLookup(hostname: string, options: { all?: boolean; family?: number }, callback: LookupCallback): void {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = addresses as unknown as Array<{ address: string; family: number }>;
    const allowed = list.filter((a) => !addressIsPrivate(a.address, a.family));
    if (allowed.length === 0) {
      const e = new Error(`Refusing to connect: ${hostname} resolves to a private/internal address`) as NodeJS.ErrnoException;
      e.code = 'ESSRF';
      return callback(e);
    }
    if (options.all) return callback(null, allowed);
    return callback(null, allowed[0].address, allowed[0].family);
  });
}

const agent = new Agent({
  connect: { lookup: guardedLookup as never },
});

export interface SafeFetchOptions extends Omit<RequestInit, 'dispatcher' | 'redirect'> {
  timeoutMs?: number;
  maxRedirects?: number;
}

export async function safeFetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 10_000, maxRedirects = 5, signal: callerSignal, ...init } = opts;
  let current = assertPublicHttpUrl(rawUrl);

  for (let hop = 0; hop <= maxRedirects; hop++) {
    // IP literals are validated syntactically by assertPublicHttpUrl; names are
    // validated at connect time by guardedLookup.
    const res = await undiciFetch(current, {
      ...init,
      dispatcher: agent,
      redirect: 'manual',
      signal: callerSignal ? AbortSignal.any([callerSignal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs),
    });

    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      const next = new URL(res.headers.get('location')!, current);
      // Drain so the socket can be reused.
      await res.body?.cancel().catch(() => undefined);
      current = assertPublicHttpUrl(next.toString());
      continue;
    }
    return res;
  }
  throw new Error('Too many redirects');
}

/** Reads a response body, aborting once `maxBytes` is exceeded. */
export async function readBodyLimited(res: Response, maxBytes: number): Promise<Buffer> {
  const declared = Number(res.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await res.body?.cancel().catch(() => undefined);
    throw new Error(`Response too large (${declared} > ${maxBytes} bytes)`);
  }

  const chunks: Buffer[] = [];
  let total = 0;
  if (!res.body) return Buffer.alloc(0);

  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    total += chunk.byteLength;
    if (total > maxBytes) {
      await res.body.cancel().catch(() => undefined);
      throw new Error(`Response exceeded ${maxBytes} bytes`);
    }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function safeFetchBuffer(
  url: string,
  opts: SafeFetchOptions & { maxBytes?: number } = {}
): Promise<{ status: number; ok: boolean; contentType: string; body: Buffer }> {
  const { maxBytes = 10 * 1024 * 1024, ...rest } = opts;
  const res = await safeFetch(url, rest);
  const body = res.ok ? await readBodyLimited(res, maxBytes) : Buffer.alloc(0);
  if (!res.ok) await res.body?.cancel().catch(() => undefined);
  return { status: res.status, ok: res.ok, contentType: res.headers.get('content-type') ?? '', body };
}

export async function safeFetchText(
  url: string,
  opts: SafeFetchOptions & { maxBytes?: number } = {}
): Promise<{ status: number; ok: boolean; contentType: string; text: string }> {
  const r = await safeFetchBuffer(url, { maxBytes: 3 * 1024 * 1024, ...opts });
  return { status: r.status, ok: r.ok, contentType: r.contentType, text: r.body.toString('utf8') };
}


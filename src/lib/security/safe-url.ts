/** URL helpers for open-redirect and SSRF hardening. */

export function isSafeHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Relative in-app path only (auth callback `next` param). */
export function isSafeRelativePath(next: string): boolean {
  if (!next.startsWith('/')) return false;
  if (next.startsWith('//')) return false;
  if (next.includes('\\')) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(next)) return false;
  return true;
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host === 'metadata.google.internal') {
    return true;
  }
  // IPv4
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  // IPv6 local / link-local (simplified)
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) {
    return true;
  }
  return false;
}

/** Block obvious internal targets before scraper fetch / proxies. */
export function assertPublicHttpUrl(raw: string): URL {
  if (!isSafeHttpUrl(raw)) {
    throw new Error('URL must be http(s)');
  }
  const u = new URL(raw);
  if (isPrivateHostname(u.hostname)) {
    throw new Error('Refusing to fetch private/internal host');
  }
  return u;
}

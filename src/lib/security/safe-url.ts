/** URL helpers for open-redirect and SSRF hardening. */

export function isSafeHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return (u.protocol === 'http:' || u.protocol === 'https:') && !u.username && !u.password;
  } catch {
    return false;
  }
}

/** Compares URLs after normalisation so encoding/trailing-slash differences do not matter. */
export function sameUrl(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  try {
    return new URL(a).toString() === new URL(b).toString();
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

// ── IP classification ────────────────────────────────────────────────────────

/** True for loopback / private / link-local / CGNAT / reserved / multicast IPv4. */
export function isPrivateIPv4(a: number, b: number, c = 0): boolean {
  if (a === 0) return true; //                         0.0.0.0/8 "this network"
  if (a === 10) return true; //                        10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 127) return true; //                       loopback
  if (a === 169 && b === 254) return true; //          link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 168) return true; //          192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; //                        multicast + reserved + broadcast
  return false;
}

/** Expands an IPv6 literal into 8 hextets; returns null when it is not valid IPv6. */
function parseIPv6(host: string): number[] | null {
  let h = host.toLowerCase();
  if (h.includes('%')) h = h.slice(0, h.indexOf('%')); // zone id
  if (!h.includes(':')) return null;

  // Embedded IPv4 tail (e.g. ::ffff:127.0.0.1)
  const v4 = h.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b, c, d] = v4.slice(1).map(Number);
    if ([a, b, c, d].some((n) => n > 255)) return null;
    h = h.slice(0, h.length - v4[0].length) + ((a << 8) | b).toString(16) + ':' + ((c << 8) | d).toString(16);
  }

  const halves = h.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;

  const parts = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail];
  if (parts.length !== 8) return null;
  const nums = parts.map((p) => (/^[0-9a-f]{1,4}$/.test(p) ? parseInt(p, 16) : NaN));
  return nums.some(Number.isNaN) ? null : nums;
}

export function isPrivateIPv6(host: string): boolean {
  const g = parseIPv6(host);
  if (!g) return false;

  if (g.every((x) => x === 0)) return true; //                                  ::  unspecified
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; //        ::1 loopback
  if ((g[0] & 0xfe00) === 0xfc00) return true; //                               fc00::/7 unique local
  if ((g[0] & 0xffc0) === 0xfe80) return true; //                               fe80::/10 link-local
  if ((g[0] & 0xff00) === 0xff00) return true; //                               ff00::/8 multicast

  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible / NAT64 (64:ff9b::/96) → check embedded IPv4
  const mapped = g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff;
  const nat64 = g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0);
  if (mapped || nat64) {
    return isPrivateIPv4(g[6] >> 8, g[6] & 0xff, g[7] >> 8);
  }
  return false;
}

/** Hostname-level check (no DNS). IP literals are classified; names only get the obvious denials. */
export function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host) return true;

  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }
  if (host === 'metadata.google.internal') return true;

  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b, c] = m.slice(1).map(Number);
    return isPrivateIPv4(a, b, c);
  }

  // Only IP *literals* contain ':' — never apply IPv6 prefix rules to ordinary
  // hostnames (e.g. "fdic.gov" must stay allowed).
  if (host.includes(':')) return isPrivateIPv6(host);

  // Single-label names ("redis", "web") resolve inside Docker/k8s networks.
  if (!host.includes('.')) return true;
  return false;
}

/** Block obvious internal targets (syntactic check). Use `assertPublicUrlResolved` before server-side fetches. */
export function assertPublicHttpUrl(raw: string): URL {
  if (!isSafeHttpUrl(raw)) {
    throw new Error('URL must be http(s) without credentials');
  }
  const u = new URL(raw);
  if (isPrivateHostname(u.hostname)) {
    throw new Error('Refusing to fetch private/internal host');
  }
  return u;
}

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

type Window = `${number} s` | `${number} m` | `${number} h`;

export interface RateLimitOptions {
  /** Namespace for the limiter, e.g. `subscribe`. */
  prefix: string;
  max: number;
  window: Window;
  /**
   * Bucket key. Defaults to the client IP. Pass `'global'` for a limiter that is
   * shared by every caller (useful as a distributed-brute-force backstop).
   */
  key?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix ms when the bucket resets. */
  reset: number;
}

function redisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.startsWith('https://') &&
      process.env.UPSTASH_REDIS_REST_TOKEN &&
      process.env.UPSTASH_REDIS_REST_TOKEN !== 'your_upstash_token'
  );
}

export function windowToMs(window: Window): number {
  const [n, unit] = window.split(' ');
  const value = Number(n);
  if (unit === 's') return value * 1000;
  if (unit === 'm') return value * 60_000;
  return value * 3_600_000;
}

// ── In-memory fallback ───────────────────────────────────────────────────────
// Per-process sliding window. Used when Upstash is not configured or errors, so
// abuse protection degrades to "per instance" instead of "off".
const memoryBuckets = new Map<string, number[]>();
const MEMORY_MAX_KEYS = 10_000;

export function memoryLimit(key: string, max: number, windowMs: number, now = Date.now()): RateLimitResult {
  const cutoff = now - windowMs;
  const hits = (memoryBuckets.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= max) {
    memoryBuckets.set(key, hits);
    return { success: false, limit: max, remaining: 0, reset: hits[0] + windowMs };
  }

  hits.push(now);
  memoryBuckets.set(key, hits);

  if (memoryBuckets.size > MEMORY_MAX_KEYS) {
    // Drop expired buckets first, then oldest entries if still too large.
    for (const [k, v] of memoryBuckets) {
      if (!v.length || v[v.length - 1] <= cutoff) memoryBuckets.delete(k);
    }
    while (memoryBuckets.size > MEMORY_MAX_KEYS) {
      const oldest = memoryBuckets.keys().next().value;
      if (oldest === undefined) break;
      memoryBuckets.delete(oldest);
    }
  }

  return { success: true, limit: max, remaining: max - hits.length, reset: hits[0] + windowMs };
}

/** Test helper. */
export function resetMemoryLimiter(): void {
  memoryBuckets.clear();
}

// ── Upstash limiters ─────────────────────────────────────────────────────────
const limiters = new Map<string, Ratelimit>();

function getUpstashLimiter(prefix: string, max: number, window: Window): Ratelimit | null {
  if (!redisConfigured()) return null;
  const cacheKey = `${prefix}:${max}:${window}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(max, window),
      analytics: true,
      prefix: `@upstash/ratelimit/${prefix}`,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

/**
 * Best-effort client IP.
 *
 * `X-Forwarded-For` is client-controlled (its left-most entry can be forged even
 * behind Cloudflare), so it is only used as a last resort, and then only the
 * right-most entry (the one appended by our own proxy) is trusted.
 * nginx.conf overwrites `X-Real-IP` with the address it verified via
 * `set_real_ip_from`, which makes it the preferred source. Vercel also sets it.
 */
export function clientIpFromHeaders(headers: { get(name: string): string | null }): string {
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const cf = headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;

  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return '127.0.0.1';
}

export function clientIp(req: Request): string {
  return clientIpFromHeaders(req.headers);
}

/** Core check: Upstash when available, in-memory otherwise (or on Redis errors). */
export async function checkRateLimit(bucket: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  const upstash = getUpstashLimiter(opts.prefix, opts.max, opts.window);
  if (upstash) {
    try {
      const r = await upstash.limit(bucket);
      return { success: r.success, limit: r.limit, remaining: r.remaining, reset: r.reset };
    } catch (err) {
      console.error('[rate-limit] Upstash error, falling back to in-memory limiter:', err);
    }
  }
  return memoryLimit(`${opts.prefix}:${bucket}`, opts.max, windowToMs(opts.window));
}

function tooManyRequests(r: RateLimitResult): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((r.reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: 'Too Many Requests', message: 'Rate limit exceeded. Try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(r.limit),
        'X-RateLimit-Remaining': String(r.remaining),
        'X-RateLimit-Reset': String(r.reset),
      },
    }
  );
}

/** Route-handler helper: returns a 429 response when limited, otherwise null. */
export async function enforceRateLimit(req: Request, opts: RateLimitOptions): Promise<NextResponse | null> {
  const bucket = opts.key ?? clientIp(req);
  const r = await checkRateLimit(bucket, opts);
  return r.success ? null : tooManyRequests(r);
}

/** Server-action helper (no Request object): true when the call is allowed. */
export async function allowByHeaders(
  headers: { get(name: string): string | null },
  opts: RateLimitOptions
): Promise<boolean> {
  const bucket = opts.key ?? clientIpFromHeaders(headers);
  return (await checkRateLimit(bucket, opts)).success;
}

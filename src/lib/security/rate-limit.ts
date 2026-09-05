import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

let redisReady = false;
try {
  redisReady = Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.startsWith('https://') &&
      process.env.UPSTASH_REDIS_REST_TOKEN &&
      process.env.UPSTASH_REDIS_REST_TOKEN !== 'your_upstash_token'
  );
} catch {
  redisReady = false;
}

const limiters = new Map<string, Ratelimit>();

function getLimiter(prefix: string, max: number, window: `${number} s` | `${number} m`): Ratelimit | null {
  if (!redisReady) return null;
  const key = `${prefix}:${max}:${window}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(max, window),
      analytics: true,
      prefix: `@upstash/ratelimit/${prefix}`,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

/** Returns a 429 response when limited; null when allowed or Redis unavailable (fail-open). */
export async function enforceRateLimit(
  req: Request,
  opts: { prefix: string; max: number; window: `${number} s` | `${number} m` }
): Promise<NextResponse | null> {
  const limiter = getLimiter(opts.prefix, opts.max, opts.window);
  if (!limiter) return null;
  try {
    const { success, limit, remaining, reset } = await limiter.limit(`${opts.prefix}:${clientIp(req)}`);
    if (success) return null;
    return NextResponse.json(
      { error: 'Too Many Requests', message: 'Rate limit exceeded. Try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
        },
      }
    );
  } catch (err) {
    console.error('[rate-limit]', err);
    return null;
  }
}

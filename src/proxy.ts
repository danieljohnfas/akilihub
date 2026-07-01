import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create a new ratelimiter, that allows 10 requests per 10 seconds
// Will only initialize if the Upstash Redis URL/Token are provided
const ratelimit = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
      prefix: '@upstash/ratelimit',
    })
  : null;

export async function proxy(request: NextRequest) {
  // 1. Supabase Auth Logic (previously proxy.ts)
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — important for Server Components to read auth state
  await supabase.auth.getUser();

  // 2. Upstash Rate Limiting Logic (only for /api/chat)
  if (request.nextUrl.pathname.startsWith('/api/chat') && ratelimit) {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    
    try {
      const { success, limit, reset, remaining } = await ratelimit.limit(ip);
      
      if (!success) {
        return NextResponse.json(
          { error: 'Too Many Requests', message: 'You have exceeded the rate limit. Please try again later.' },
          { status: 429 }
        );
      }

      // Add rate limit headers to the supabase response
      supabaseResponse.headers.set('X-RateLimit-Limit', limit.toString());
      supabaseResponse.headers.set('X-RateLimit-Remaining', remaining.toString());
      supabaseResponse.headers.set('X-RateLimit-Reset', reset.toString());
      
    } catch (error) {
      console.error('Rate Limiter Error:', error);
      // Fail open if Redis fails, so the app doesn't go down
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

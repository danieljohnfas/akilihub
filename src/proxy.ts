import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { verifyAdminSession, SESSION_COOKIE } from '@/lib/admin/session';

// Create a new ratelimiter, that allows 10 requests per 10 seconds
// Will only initialize if the Upstash Redis URL/Token are provided
let ratelimit: Ratelimit | null = null;
try {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_URL.startsWith('https://') &&
    process.env.UPSTASH_REDIS_REST_TOKEN &&
    process.env.UPSTASH_REDIS_REST_TOKEN !== 'your_upstash_token'
  ) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
      prefix: '@upstash/ratelimit',
    });
  }
} catch (e) {
  console.error('⚠️ Upstash Redis failed to initialize:', e);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin Route Protection ──────────────────────────────────────────────
  // All /admin/* routes require a valid admin session cookie,
  // except the login and setup pages themselves.
  if (pathname.startsWith('/admin')) {
    const isPublicAdminRoute =
      pathname.startsWith('/admin/login') ||
      pathname.startsWith('/admin/setup');

    if (!isPublicAdminRoute) {
      const token = request.cookies.get(SESSION_COOKIE)?.value;
      const valid = token ? await verifyAdminSession(token) : false;
      if (!valid) {
        const loginUrl = new URL('/admin/login', request.url);
        return NextResponse.redirect(loginUrl);
      }
    }
  }
  // ── End Admin Protection ────────────────────────────────────────────────

  try {
    // 1. Supabase Auth Logic
    let supabaseResponse = NextResponse.next({ request });

    // Validate the Supabase URL before use — an empty string passes the JS ||
    // fallback but still fails Supabase's internal URL validator.
    const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    let supabaseUrl = 'https://dummy.supabase.co';
    try {
      if (rawSupabaseUrl) {
        new URL(rawSupabaseUrl); // throws if invalid
        supabaseUrl = rawSupabaseUrl;
      }
    } catch {
      console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL is invalid, Supabase auth disabled.');
    }

    const supabase = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key',
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
    // If Supabase is misconfigured, this will fail silently (supabaseUrl is dummy)
    if (supabaseUrl !== 'https://dummy.supabase.co') {
      await supabase.auth.getUser();
    }


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
  } catch (error: any) {
    console.error('Middleware Error:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Middleware Error', 
        message: error.message || error.toString()
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

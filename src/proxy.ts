// Next.js 16: this file was `middleware.ts` (the convention was renamed to `proxy`; it runs on the Node.js runtime).
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminSession, SESSION_COOKIE } from '@/lib/admin/session';
import { checkRateLimit, clientIpFromHeaders } from '@/lib/security/rate-limit';

// Generic backstop for every API route (stricter per-route limits live in the handlers).
// /api/inngest (Inngest cloud IPs) and /api/health (uptime monitors) are exempt.
const API_LIMIT = { prefix: 'api-global', max: 120, window: '1 m' } as const;
const API_LIMIT_EXEMPT = ['/api/inngest', '/api/health'];

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


    // 2. Rate limiting backstop for API routes
    const isApi = pathname.startsWith('/api/') && !API_LIMIT_EXEMPT.some((p) => pathname.startsWith(p));
    if (isApi) {
      const ip = clientIpFromHeaders(request.headers);
      const r = await checkRateLimit(ip, API_LIMIT);
      if (!r.success) {
        return NextResponse.json(
          { error: 'Too Many Requests', message: 'You have exceeded the rate limit. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((r.reset - Date.now()) / 1000))) } }
        );
      }
      supabaseResponse.headers.set('X-RateLimit-Limit', String(r.limit));
      supabaseResponse.headers.set('X-RateLimit-Remaining', String(r.remaining));
      supabaseResponse.headers.set('X-RateLimit-Reset', String(r.reset));
    }

    return supabaseResponse;
  } catch (error) {
    console.error('Middleware Error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

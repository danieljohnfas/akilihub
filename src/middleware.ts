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

export async function middleware(request: NextRequest) {
  // Only apply rate limiting to the chat API
  if (request.nextUrl.pathname.startsWith('/api/chat') && ratelimit) {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    
    try {
      const { success, limit, reset, remaining } = await ratelimit.limit(ip);
      
      const response = success
        ? NextResponse.next()
        : NextResponse.json(
            { error: 'Too Many Requests', message: 'You have exceeded the rate limit. Please try again later.' },
            { status: 429 }
          );

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', reset.toString());
      
      return response;
    } catch (error) {
      console.error('Rate Limiter Error:', error);
      // Fail open if Redis fails, so the app doesn't go down
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};

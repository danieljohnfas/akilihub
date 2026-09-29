import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/security/rate-limit';

/**
 * Collector for Content-Security-Policy violation reports (see next.config.ts).
 *
 * Browsers POST `application/csp-report` (or `application/reports+json`) here. We only log a
 * truncated, single-line summary: the endpoint is public, so it is rate-limited and size-capped
 * and never stores or reflects the report.
 */
const MAX_BYTES = 8 * 1024;

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, { prefix: 'csp-report', max: 30, window: '1 m' });
  if (limited) return limited;

  try {
    const raw = (await req.text()).slice(0, MAX_BYTES);
    const parsed = JSON.parse(raw);
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    for (const entry of entries.slice(0, 5)) {
      const r = entry?.['csp-report'] ?? entry?.body ?? {};
      const summary = {
        directive: String(r['effective-directive'] ?? r.effectiveDirective ?? r['violated-directive'] ?? '').slice(0, 80),
        blocked: String(r['blocked-uri'] ?? r.blockedURL ?? '').slice(0, 200),
        page: String(r['document-uri'] ?? r.documentURL ?? '').slice(0, 200),
      };
      console.warn('[csp-report]', JSON.stringify(summary));
    }
  } catch {
    /* malformed report: ignore */
  }
  return new NextResponse(null, { status: 204 });
}

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, safeQuery } from '@/lib/db/client';
import { outboundClicks } from '@/lib/db/schema/analytics';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { complianceRequirements } from '@/lib/db/schema/compliance';
import { appendTrackingTag } from '@/lib/utils';
import { isSafeHttpUrl, sameUrl } from '@/lib/security/safe-url';
import { enforceRateLimit } from '@/lib/security/rate-limit';

const querySchema = z.object({
  url: z.string().max(2048),
  type: z.enum(['job', 'tender', 'compliance_resource']),
  id: z.string().uuid(),
});

async function storedUrlsFor(type: 'job' | 'tender' | 'compliance_resource', id: string): Promise<Array<string | null>> {
  switch (type) {
    case 'job': {
      const [row] = await safeQuery(
        db.select({ s: jobs.sourceUrl, e: jobs.employerUrl }).from(jobs).where(eq(jobs.id, id)).limit(1),
        5000,
        'out: job'
      );
      return row ? [row.s, row.e] : [];
    }
    case 'tender': {
      const [row] = await safeQuery(
        db.select({ s: tenders.sourceUrl, e: tenders.employerUrl }).from(tenders).where(eq(tenders.id, id)).limit(1),
        5000,
        'out: tender'
      );
      return row ? [row.s, row.e] : [];
    }
    case 'compliance_resource': {
      const [row] = await safeQuery(
        db
          .select({ s: complianceRequirements.sourceUrl, e: complianceRequirements.employerUrl })
          .from(complianceRequirements)
          .where(eq(complianceRequirements.id, id))
          .limit(1),
        5000,
        'out: compliance'
      );
      return row ? [row.s, row.e] : [];
    }
  }
}

/**
 * Outbound click tracker + redirect.
 *
 * This used to redirect to ANY http(s) URL (open redirect usable for phishing from our
 * domain). It now only redirects to a URL that is actually stored on the referenced
 * job / tender / compliance record.
 */
export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, { prefix: 'out', max: 60, window: '1 m' });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    url: searchParams.get('url'),
    type: searchParams.get('type'),
    id: searchParams.get('id'),
  });

  if (!parsed.success || !isSafeHttpUrl(parsed.data.url)) {
    return new NextResponse('Invalid or missing parameters', { status: 400 });
  }
  const { url: targetUrl, type: entityType, id: entityId } = parsed.data;

  const stored = await storedUrlsFor(entityType, entityId);
  if (!stored.some((s) => sameUrl(s, targetUrl))) {
    return new NextResponse('Unknown destination', { status: 400 });
  }

  // Fire-and-forget click log; never block or fail the redirect on analytics.
  db.insert(outboundClicks)
    .values({ entityType, entityId, targetUrl })
    .execute()
    .catch((err) => console.error('Failed to log outbound click:', err));

  const finalUrl = appendTrackingTag(targetUrl) || targetUrl;
  return NextResponse.redirect(finalUrl);
}

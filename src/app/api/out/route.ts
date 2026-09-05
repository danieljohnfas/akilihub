import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { outboundClicks } from '@/lib/db/schema/analytics';
import { appendTrackingTag } from '@/lib/utils';
import { isSafeHttpUrl } from '@/lib/security/safe-url';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');
  const entityType = searchParams.get('type');
  const entityId = searchParams.get('id');

  if (!targetUrl || !isSafeHttpUrl(targetUrl)) {
    return new NextResponse('Invalid or missing url parameter', { status: 400 });
  }

  if (entityType && entityId) {
    try {
      db.insert(outboundClicks)
        .values({ entityType, entityId, targetUrl })
        .execute()
        .catch(console.error);
    } catch (error) {
      console.error('Failed to log outbound click:', error);
    }
  }

  const finalUrl = appendTrackingTag(targetUrl) || targetUrl;
  return NextResponse.redirect(finalUrl);
}

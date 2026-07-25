import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { outboundClicks } from '@/lib/db/schema/analytics';
import { appendTrackingTag } from '@/lib/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');
  const entityType = searchParams.get('type'); // 'job', 'tender', 'compliance_resource'
  const entityId = searchParams.get('id');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // Fire and forget analytics logging
  if (entityType && entityId) {
    try {
      // Don't await this, let it run in the background
      db.insert(outboundClicks).values({
        entityType,
        entityId,
        targetUrl,
      }).execute().catch(console.error);
    } catch (error) {
      console.error('Failed to log outbound click:', error);
    }
  }

  const finalUrl = appendTrackingTag(targetUrl) || targetUrl;

  return NextResponse.redirect(finalUrl);
}

import { NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  
  if (secret !== 'akilibrain-mass-scrape-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const COUNTRIES = ['ke', 'tz', 'ug', 'rw', 'et', 'cd', 'bi', 'so', 'ss'];
  const MODULES = ['jobs', 'tenders', 'compliance'];
  const events: any[] = [];

  for (const country of COUNTRIES) {
    for (const module of MODULES) {
      events.push({
        name: `manual.scrape.${module}` as any,
        data: { countryCode: country, isMassScrape: true },
      });
    }
  }

  // Also trigger manual review
  events.push({
    name: 'manual.data.review',
    data: {},
  });

  try {
    await inngest.send(events);
    return NextResponse.json({ success: true, count: events.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

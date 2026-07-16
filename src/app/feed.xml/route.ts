import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { countries } from '@/lib/db/schema/shared';
import { eq, desc, and, isNull, or, gt } from 'drizzle-orm';

const BASE_URL = 'https://akilibrain.com';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const now = new Date();

  // Fetch latest 30 active jobs
  const jobRows = await safeQuery(
    db
      .select({
        id: jobs.id,
        title: jobs.title,
        companyName: jobs.companyName,
        description: jobs.description,
        location: jobs.location,
        country: countries.name,
        postedDate: jobs.postedDate,
        updatedAt: jobs.updatedAt,
        deadline: jobs.deadline,
      })
      .from(jobs)
      .leftJoin(countries, eq(jobs.countryId, countries.id))
      .where(
        and(
          eq(jobs.isActive, true),
          or(isNull(jobs.deadline), gt(jobs.deadline, now))
        )
      )
      .orderBy(desc(jobs.updatedAt))
      .limit(30)
  );

  // Fetch latest 20 open tenders
  const tenderRows = await safeQuery(
    db
      .select({
        id: tenders.id,
        title: tenders.title,
        authority: tenders.contractingAuthority,
        description: tenders.description,
        country: countries.name,
        deadline: tenders.deadline,
        publishedAt: tenders.publishedAt,
        updatedAt: tenders.updatedAt,
      })
      .from(tenders)
      .leftJoin(countries, eq(tenders.countryId, countries.id))
      .where(eq(tenders.status, 'open'))
      .orderBy(desc(tenders.updatedAt))
      .limit(20)
  );

  const jobItems = jobRows.map((j) => {
    const title = escapeXml(`${j.title} — ${j.companyName}`);
    const location = j.location ?? j.country ?? 'East Africa';
    const desc = escapeXml(
      (j.description ?? `${j.title} at ${j.companyName} in ${location}.`).slice(0, 300)
    );
    const pubDate = (j.postedDate ?? j.updatedAt).toUTCString();
    const link = `${BASE_URL}/jobs/${j.id}`;
    const deadline = j.deadline ? `Deadline: ${j.deadline.toDateString()}. ` : '';

    return `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(deadline)}${desc}</description>
      <pubDate>${pubDate}</pubDate>
      <category>Jobs</category>
    </item>`;
  });

  const tenderItems = tenderRows.map((t) => {
    const title = escapeXml(t.title);
    const desc = escapeXml(
      (t.description ?? `Government tender by ${t.authority} in ${t.country ?? 'East Africa'}.`).slice(0, 300)
    );
    const pubDate = (t.publishedAt ?? t.updatedAt).toUTCString();
    const link = `${BASE_URL}/tenders/${t.id}`;
    const deadline = t.deadline ? `Deadline: ${t.deadline.toDateString()}. ` : '';

    return `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(deadline)}${desc}</description>
      <pubDate>${pubDate}</pubDate>
      <category>Tenders</category>
    </item>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AkiliBrain — East Africa Intelligence Feed</title>
    <link>${BASE_URL}</link>
    <description>Latest government tenders and job opportunities across East Africa — Kenya, Tanzania, Uganda, and Rwanda.</description>
    <language>en-ke</language>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${BASE_URL}/icon.svg</url>
      <title>AkiliBrain</title>
      <link>${BASE_URL}</link>
    </image>
    ${jobItems.join('')}
    ${tenderItems.join('')}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

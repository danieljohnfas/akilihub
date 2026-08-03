import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { tenders } from '../src/lib/db/schema/tenders';
import { guides } from '../src/lib/db/schema/guides';
import { outboundClicks } from '../src/lib/db/schema/analytics';
import { eq, count } from 'drizzle-orm';

interface AuditResult {
  url: string;
  type: string;
  status: number;
  totalTimeMs: number;
  title: string;
  titleLength: number;
  titleScore: 'PASS' | 'WARN' | 'FAIL';
  hasDescription: boolean;
  descLength: number;
  descScore: 'PASS' | 'WARN' | 'FAIL';
  hasCanonical: boolean;
  canonicalUrl: string;
  h1Count: number;
  h1Text: string;
  ogTitle: boolean;
  ogImage: boolean;
  twitterCard: boolean;
  schemas: string[];
  missingAltImages: number;
  totalImages: number;
}

interface SecurityHeadersResult {
  url: string;
  status: number;
  protocol: string;
  hsts: boolean;
  xContentTypeOptions: boolean;
  xFrameOptions: boolean;
  referrerPolicy: boolean;
  contentEncoding: string;
  cacheControl: string;
  server: string;
}

async function runDeepAudit() {
  console.log('===========================================================');
  console.log('🚀 AKILIBRAIN DEEP CLI SEO & TRAFFIC READINESS AUDIT 🚀');
  console.log('===========================================================\n');

  // Fetch sample IDs for real dynamic pages
  const [sampleJob] = await db.select({ id: jobs.id, title: jobs.title }).from(jobs).where(eq(jobs.isActive, true)).limit(1);
  const [sampleTender] = await db.select({ id: tenders.id, title: tenders.title }).from(tenders).where(eq(tenders.status, 'open')).limit(1);
  const [sampleGuide] = await db.select({ slug: guides.slug, title: guides.title }).from(guides).where(eq(guides.isPublished, true)).limit(1);

  const targetUrls = [
    { url: 'https://akilibrain.com/', type: 'Home' },
    { url: 'https://akilibrain.com/jobs', type: 'Hub (Jobs)' },
    { url: 'https://akilibrain.com/tenders', type: 'Hub (Tenders)' },
    { url: 'https://akilibrain.com/salaries', type: 'Hub (Salaries)' },
    { url: 'https://akilibrain.com/compliance', type: 'Hub (Compliance)' },
    { url: 'https://akilibrain.com/health', type: 'Hub (Health)' },
    { url: 'https://akilibrain.com/guides', type: 'Hub (Guides)' },
    { url: 'https://akilibrain.com/developers', type: 'Hub (Devs)' },
    { url: 'https://akilibrain.com/about', type: 'Static Page' },
    { url: 'https://akilibrain.com/pricing', type: 'Commercial' },
  ];

  if (sampleJob) {
    targetUrls.push({ url: `https://akilibrain.com/jobs/${sampleJob.id}`, type: 'Detail (Job)' });
  }
  if (sampleTender) {
    targetUrls.push({ url: `https://akilibrain.com/tenders/${sampleTender.id}`, type: 'Detail (Tender)' });
  }
  if (sampleGuide) {
    targetUrls.push({ url: `https://akilibrain.com/guides/${sampleGuide.slug}`, type: 'Detail (Guide)' });
  }

  const results: AuditResult[] = [];
  const securityHeaders: SecurityHeadersResult[] = [];
  const discoveredLinks = new Set<string>();

  for (const item of targetUrls) {
    const start = Date.now();
    const res = await fetch(item.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AkiliBrain-SEO-Auditor/1.0)',
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });
    const totalTimeMs = Date.now() - start;
    const html = await res.text();

    // Security & Headers
    securityHeaders.push({
      url: item.url,
      status: res.status,
      protocol: res.headers.get('x-vercel-cache') ? 'Vercel Edge (HTTP/2+)' : 'HTTPS',
      hsts: res.headers.has('strict-transport-security'),
      xContentTypeOptions: res.headers.has('x-content-type-options'),
      xFrameOptions: res.headers.has('x-frame-options'),
      referrerPolicy: res.headers.has('referrer-policy'),
      contentEncoding: res.headers.get('content-encoding') || 'none',
      cacheControl: res.headers.get('cache-control') || 'none',
      server: res.headers.get('server') || 'Vercel'
    });

    // Extract Title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].trim() : '';
    const titleLength = title.length;
    let titleScore: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
    if (titleLength === 0) titleScore = 'FAIL';
    else if (titleLength < 30 || titleLength > 65) titleScore = 'WARN';

    // Extract Meta Description
    const descMatch = html.match(/<meta name="description" content="([^"]*)"/);
    const desc = descMatch ? descMatch[1].trim() : '';
    const descLength = desc.length;
    let descScore: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
    if (descLength === 0) descScore = 'FAIL';
    else if (descLength < 70 || descLength > 165) descScore = 'WARN';

    // Canonical
    const canonicalMatch = html.match(/<link rel="canonical" href="([^"]*)"/);

    // H1 check
    const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
    const h1Count = h1Matches.length;
    let h1Text = '';
    if (h1Matches.length > 0 && h1Matches[0]) {
      h1Text = h1Matches[0].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    }

    // OpenGraph & Twitter
    const ogTitle = Boolean(html.match(/<meta property="og:title"/));
    const ogImage = Boolean(html.match(/<meta property="og:image"/));
    const twitterCard = Boolean(html.match(/<meta name="twitter:card"/));

    // Structured JSON-LD Schemas
    const schemaRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
    const schemas: string[] = [];
    let sMatch;
    while ((sMatch = schemaRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(sMatch[1]);
        if (parsed['@type']) {
          schemas.push(parsed['@type']);
        } else if (parsed['@graph']) {
          schemas.push(...parsed['@graph'].map((g: any) => g['@type']));
        }
      } catch {
        schemas.push('Malformed JSON-LD');
      }
    }

    // Images alt scan
    const imgMatches = html.match(/<img[^>]+>/gi) || [];
    let missingAlt = 0;
    for (const img of imgMatches) {
      if (!img.includes('alt=') || img.includes('alt=""')) {
        missingAlt++;
      }
    }

    // Collect internal links for link check
    const hrefMatches = html.match(/href="([^"]+)"/gi) || [];
    for (const href of hrefMatches) {
      const match = href.match(/href="([^"]+)"/);
      if (match && match[1].startsWith('/') && !match[1].startsWith('/_next') && !match[1].startsWith('/api')) {
        discoveredLinks.add('https://akilibrain.com' + match[1]);
      }
    }

    results.push({
      url: item.url,
      type: item.type,
      status: res.status,
      totalTimeMs,
      title,
      titleLength,
      titleScore,
      hasDescription: Boolean(descMatch),
      descLength,
      descScore,
      hasCanonical: Boolean(canonicalMatch),
      canonicalUrl: canonicalMatch ? canonicalMatch[1] : 'NONE',
      h1Count,
      h1Text: h1Text.slice(0, 50) + (h1Text.length > 50 ? '...' : ''),
      ogTitle,
      ogImage,
      twitterCard,
      schemas,
      missingAltImages: missingAlt,
      totalImages: imgMatches.length
    });
  }

  // Broken Link Verification on Top Discovered Internal Links
  console.log('--- 1. INTERNAL LINKS & CRAWL HEALTH ---');
  const sampleLinks = Array.from(discoveredLinks).slice(0, 15);
  console.log(`Discovered ${discoveredLinks.size} unique internal routes. Testing top sample (${sampleLinks.length}):`);
  
  const linkCheckResults = await Promise.all(
    sampleLinks.map(async (link) => {
      try {
        const r = await fetch(link, { method: 'HEAD' });
        return { link: link.replace('https://akilibrain.com', ''), status: r.status, ok: r.status < 400 };
      } catch (err: any) {
        return { link: link.replace('https://akilibrain.com', ''), status: 500, ok: false };
      }
    })
  );
  console.table(linkCheckResults);

  // Print SEO Results Table
  console.log('\n--- 2. ON-PAGE SEO & CONTENT AUDIT ---');
  console.table(
    results.map(r => ({
      Page: r.url.replace('https://akilibrain.com', '') || '/',
      Type: r.type,
      Status: r.status,
      Time: `${r.totalTimeMs}ms`,
      TitleLen: `${r.titleLength} (${r.titleScore})`,
      DescLen: `${r.descLength} (${r.descScore})`,
      H1s: r.h1Count,
      Schemas: r.schemas.join(', ') || 'None',
      Images: `${r.totalImages - r.missingAltImages}/${r.totalImages} with alt`
    }))
  );

  // Print Security Headers Table
  console.log('\n--- 3. SECURITY HEADERS & EDGE CDN PERFORMANCE ---');
  console.table(
    securityHeaders.map(s => ({
      Page: s.url.replace('https://akilibrain.com', '') || '/',
      Status: s.status,
      HSTS: s.hsts ? '✅ Enabled' : '❌ Missing',
      'X-Content-Type': s.xContentTypeOptions ? '✅ Enabled' : '❌ Missing',
      'X-Frame-Opt': s.xFrameOptions ? '✅ Enabled' : '❌ Missing',
      Compression: s.contentEncoding,
      'Cache-Control': s.cacheControl.slice(0, 30)
    }))
  );

  // Database Analytics Check
  console.log('\n--- 4. TRAFFIC & ENGAGEMENT METRICS IN DB ---');
  const [clickCount] = await db.select({ value: count() }).from(outboundClicks);
  console.log('Recorded Outbound Interactions:', clickCount?.value || 0);

  console.log('\n===========================================================');
  console.log('✅ AUDIT COMPLETED SUCCESSFULLY');
  console.log('===========================================================');
  process.exit(0);
}

runDeepAudit();

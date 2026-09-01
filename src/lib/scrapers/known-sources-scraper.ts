/**
 * known-sources-scraper.ts
 *
 * Priority-first scraping from already-documented, clean employer/authority URLs.
 *
 * RATIONALE:
 *  Every time the `resolve-employer-urls` pipeline successfully resolves a job or
 *  tender's `employerUrl`, we gain a verified, direct link to that employer's or
 *  authority's website. Over time, this builds a rich database of clean, canonical
 *  sources.
 *
 *  This module queries those stored URLs FIRST — before any broad Google search —
 *  to fetch fresh listings directly from the source. This produces:
 *    1. Zero aggregator contamination (URLs are pre-vetted).
 *    2. Higher data density (employer career pages list many jobs at once).
 *    3. Better SEO authority (direct-source links rank well).
 *    4. Reinforcing data quality loop (more known URLs → richer future scrapes).
 *
 * USAGE:
 *  Call `getKnownEmployerUrlsForCountry(countryId, module, limit)` to get a
 *  deduplicated list of known employer base URLs for a given country and module.
 *  Then use these URLs as a priority scrape target before running broad queries.
 */

import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { complianceRequirements } from '@/lib/db/schema/compliance';
import { isNotNull, eq, and, sql } from 'drizzle-orm';
import { fetchHtml, htmlToTextEnriched } from './compliance-base';
import { isEmployerUrl } from '@/lib/sources/aggregators';

/**
 * Derives the root/base URL of an employer from a full URL.
 * e.g. "https://careers.who.int/jobs/123?ref=abc" → "https://careers.who.int/jobs"
 * This lets us scrape the listing page rather than a single deep-link.
 */
function deriveListingBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // If the path looks like it ends in an ID (digits or UUID), go up one level
    const segments = parsed.pathname.replace(/\/+$/, '').split('/');
    const lastSegment = segments[segments.length - 1];
    const looksLikeId =
      /^\d+$/.test(lastSegment) ||
      /^[0-9a-f-]{36}$/i.test(lastSegment) ||
      /^[a-z0-9-]{8,}$/i.test(lastSegment);

    if (looksLikeId && segments.length > 2) {
      segments.pop();
      parsed.pathname = segments.join('/') + '/';
    }

    // Strip query params and hash — they often include session/tracking noise
    parsed.search = '';
    parsed.hash = '';

    return parsed.href;
  } catch {
    return url;
  }
}

/**
 * Queries the DB and returns a deduplicated list of known clean employer
 * base URLs for a given country and module.
 *
 * These have already been vetted by the employer-resolver pipeline, so
 * they are guaranteed non-aggregator direct sources.
 */
export async function getKnownEmployerUrlsForCountry(
  countryId: string,
  module: 'jobs' | 'tenders' | 'compliance',
  limit = 40
): Promise<string[]> {
  let rawUrls: (string | null)[] = [];

  try {
    if (module === 'jobs') {
      const rows = await db
        .selectDistinct({ url: jobs.employerUrl })
        .from(jobs)
        .where(
          and(
            eq(jobs.countryId, countryId),
            eq(jobs.isActive, true),
            isNotNull(jobs.employerUrl),
            eq(jobs.isAggregatorSource, false)
          )
        )
        .limit(limit);
      rawUrls = rows.map(r => r.url);

    } else if (module === 'tenders') {
      const rows = await db
        .selectDistinct({ url: tenders.employerUrl })
        .from(tenders)
        .where(
          and(
            eq(tenders.countryId, countryId),
            isNotNull(tenders.employerUrl),
            eq(tenders.isAggregatorSource, false)
          )
        )
        .limit(limit);
      rawUrls = rows.map(r => r.url);

    } else if (module === 'compliance') {
      const rows = await db
        .selectDistinct({ url: complianceRequirements.sourceUrl })
        .from(complianceRequirements)
        .where(
          and(
            eq(complianceRequirements.countryId, countryId),
            eq(complianceRequirements.isActive, true),
            isNotNull(complianceRequirements.sourceUrl)
          )
        )
        .limit(limit);
      rawUrls = rows.map(r => r.url);
    }
  } catch (err) {
    console.warn(`[known-sources] DB query failed for ${module}/${countryId}:`, (err as Error).message);
    return [];
  }

  // Deduplicate by derived base URL, filtering any that sneak past as aggregators
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of rawUrls) {
    if (!raw) continue;
    if (!isEmployerUrl(raw)) continue;
    const base = deriveListingBaseUrl(raw);
    if (!seen.has(base)) {
      seen.add(base);
      result.push(base);
    }
  }

  return result;
}

/**
 * Scrapes a list of known employer URLs and returns raw { url, text } pairs.
 * Used by the scrapers to feed text into their AI extraction functions.
 *
 * Applies a polite delay between requests and silently drops failed pages.
 */
export async function scrapeKnownUrls(
  urls: string[],
  delayMs = 2000
): Promise<Array<{ url: string; text: string; pdfLinks: string[] }>> {
  const results: Array<{ url: string; text: string; pdfLinks: string[] }> = [];

  for (const url of urls) {
    try {
      const html = await fetchHtml(url);
      if (!html) continue;
      const { text, pdfLinks } = await htmlToTextEnriched(html, url);
      if (text && text.length >= 100) {
        results.push({ url, text, pdfLinks: pdfLinks ?? [] });
      }
    } catch (err) {
      console.warn(`[known-sources] Failed to fetch ${url}: ${(err as Error).message}`);
    }

    if (delayMs > 0) {
      await new Promise(res => setTimeout(res, delayMs));
    }
  }

  return results;
}

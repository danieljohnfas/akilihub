/**
 * EMPLOYER URL RESOLVER
 *
 * Given a URL (which may point to an aggregator, ATS platform, or employer
 * directly) and optional metadata (company, title), resolves and returns the
 * canonical employer/authority URL.
 *
 * Multi-Stage Resolution Strategy:
 *  1. Direct ATS Platform Check:
 *     If sourceUrl is already a recognized ATS (Workday, TalentClue, Greenhouse,
 *     Lever, BambooHR, SmartRecruiters, Taleo, SuccessFactors, etc.) → return as-is.
 *  2. Direct Government Portal Check:
 *     If sourceUrl is an official government domain (.go.ke, .go.tz, .gov.rw, etc.) → return as-is.
 *  3. Direct Employer Check:
 *     If sourceUrl is not a known aggregator and passes strict validation → return as-is.
 *  4. HTML Deep Inspection:
 *     Fetch page, strip noise (scripts, styles, headers, footers, ad containers),
 *     extract candidate links and text URLs, score candidates with priority to ATS & Gov,
 *     filter out all aggregator/affiliate/CDN/ad domains.
 *  5. Search Engine Fallback (Serper):
 *     If extraction fails and company/title metadata is present, query Google via Serper
 *     specifically targeting ATS platforms and authoritative employer career pages.
 *  6. Fail-Safe:
 *     If no authoritative employer link can be confirmed, return null so that aggregator
 *     links are NEVER mistakenly stored as canonical employer URLs.
 */

import * as cheerio from 'cheerio';
import { fetchHtml } from '@/lib/scrapers/compliance-base';
import {
  isAggregatorUrl,
  isAtsPlatform,
  isGovernmentPortal,
  isEmployerUrl,
} from './aggregators';

export interface EmployerResolverMetadata {
  title?: string;
  company?: string;
}

export interface ResolvedEmployerUrl {
  /** The resolved employer/authority URL, or null if resolution failed. */
  employerUrl: string | null;
  /** Whether the source URL was a known aggregator. */
  isAggregator: boolean;
  /** Whether the source URL was already an ATS platform. */
  isAtsPlatform: boolean;
  /** Whether the source URL was already a government portal. */
  isGovernmentPortal: boolean;
  /** Resolution method used */
  method?: 'direct_ats' | 'direct_gov' | 'direct_employer' | 'html_extraction' | 'search_resolution' | 'unresolved';
}

/**
 * Searches for authoritative ATS or direct career pages using Serper.
 */
async function searchEmployerViaSerper(
  company?: string,
  title?: string
): Promise<string | null> {
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey || !company || company.toLowerCase() === 'unknown') return null;

  const cleanCompany = company
    .replace(/\s+(ltd|limited|inc|plc|corp|group|corporation|ngo|foundation)\.?$/i, '')
    .trim();
  const cleanTitle = (title || '').trim();

  // Tier 1: Search Known ATS platforms
  const atsPlatformsQuery = `site:talentclue.com OR site:myworkdayjobs.com OR site:greenhouse.io OR site:lever.co OR site:bamboohr.com OR site:smartrecruiters.com OR site:recruitee.com OR site:taleo.net OR site:successfactors.com OR site:workable.com OR site:ashbyhq.com OR site:applytojob.com "${cleanCompany}" "${cleanTitle}"`;
  try {
    const resAts = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: atsPlatformsQuery, num: 3 }),
      signal: AbortSignal.timeout(5000),
    });
    if (resAts.ok) {
      const dataAts = await resAts.json();
      if (dataAts.organic && Array.isArray(dataAts.organic)) {
        for (const item of dataAts.organic) {
          if (item.link && isEmployerUrl(item.link)) {
            return item.link;
          }
        }
      }
    }
  } catch {}

  // Tier 2: Search Direct Company Career Page
  if (cleanTitle) {
    const directQuery = `"${cleanCompany}" "${cleanTitle}" (careers OR apply OR vacancy OR "job opening")`;
    try {
      const resDirect = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: directQuery, num: 5 }),
        signal: AbortSignal.timeout(5000),
      });
      if (resDirect.ok) {
        const dataDirect = await resDirect.json();
        if (dataDirect.organic && Array.isArray(dataDirect.organic)) {
          for (const item of dataDirect.organic) {
            if (item.link && isEmployerUrl(item.link)) {
              return item.link;
            }
          }
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Extracts and scores candidate employer URLs from raw HTML content.
 */
function extractCandidateLinks(
  html: string,
  baseUrl: string
): Array<{ url: string; score: number }> {
  const candidates: Array<{ url: string; score: number }> = [];

  try {
    const $ = cheerio.load(html);

    // Remove noise elements
    $('script, style, head, nav, footer, header, noscript, iframe').remove();

    // 1. Process <a> tags
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')?.trim() || '';
      const text = $(el).text().trim().toLowerCase();

      let resolved = '';
      try {
        resolved = new URL(href, baseUrl).href;
      } catch {
        return;
      }

      if (!isEmployerUrl(resolved)) return;

      let score = 1;
      if (isAtsPlatform(resolved)) score += 20;
      if (isGovernmentPortal(resolved)) score += 15;
      if (/\.(pdf|docx?|xlsx?)(\?.*)?$/i.test(resolved)) score += 10;
      if (
        text.includes('apply') ||
        text.includes('original') ||
        text.includes('official') ||
        text.includes('portal') ||
        text.includes('postuler') ||
        text.includes('pakua') ||
        text.includes('tangazo')
      ) {
        score += 5;
      }

      candidates.push({ url: resolved, score });
    });

    // 2. Process plain text URLs inside clean body
    const bodyText = $('body').text();
    const plainUrls = bodyText.match(/https?:\/\/[^\s"'<>)]+/g) || [];
    for (const pUrl of plainUrls) {
      if (isEmployerUrl(pUrl)) {
        let score = 1;
        if (isAtsPlatform(pUrl)) score += 20;
        if (isGovernmentPortal(pUrl)) score += 15;
        candidates.push({ url: pUrl, score });
      }
    }
  } catch {}

  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Resolves a source URL to the canonical employer/authority URL.
 *
 * Primary entry point for:
 *  - Retroactive backfill job (resolve-employer-urls.ts)
 *  - Forward scraping pipeline (broad-search-engine.ts)
 */
export async function resolveEmployerUrl(
  sourceUrl: string,
  metadata?: EmployerResolverMetadata
): Promise<ResolvedEmployerUrl> {
  const isAts = isAtsPlatform(sourceUrl);
  const isGov = isGovernmentPortal(sourceUrl);
  const isAgg = isAggregatorUrl(sourceUrl);

  // Stage 1: ATS platform → IS the employer URL
  if (isAts) {
    return {
      employerUrl: sourceUrl,
      isAggregator: false,
      isAtsPlatform: true,
      isGovernmentPortal: false,
      method: 'direct_ats',
    };
  }

  // Stage 2: Government portal → IS the authority URL
  if (isGov) {
    return {
      employerUrl: sourceUrl,
      isAggregator: false,
      isAtsPlatform: false,
      isGovernmentPortal: true,
      method: 'direct_gov',
    };
  }

  // Stage 3: Clean direct employer domain (not a known aggregator)
  if (!isAgg && isEmployerUrl(sourceUrl)) {
    return {
      employerUrl: sourceUrl,
      isAggregator: false,
      isAtsPlatform: false,
      isGovernmentPortal: false,
      method: 'direct_employer',
    };
  }

  // Stage 4: Aggregator page — fetch and extract candidate links
  try {
    const html = await fetchHtml(sourceUrl);
    if (html) {
      const candidates = extractCandidateLinks(html, sourceUrl);
      if (candidates.length > 0 && candidates[0].score >= 1) {
        const best = candidates[0];
        return {
          employerUrl: best.url,
          isAggregator: true,
          isAtsPlatform: isAtsPlatform(best.url),
          isGovernmentPortal: isGovernmentPortal(best.url),
          method: 'html_extraction',
        };
      }
    }
  } catch (err) {
    console.error(`[employer-resolver] Failed to fetch ${sourceUrl}:`, (err as Error).message);
  }

  // Stage 5: Search engine fallback (Serper)
  if (metadata?.company || metadata?.title) {
    try {
      const searched = await searchEmployerViaSerper(metadata.company, metadata.title);
      if (searched) {
        return {
          employerUrl: searched,
          isAggregator: true,
          isAtsPlatform: isAtsPlatform(searched),
          isGovernmentPortal: isGovernmentPortal(searched),
          method: 'search_resolution',
        };
      }
    } catch (err) {
      console.error(`[employer-resolver] Serper search failed:`, (err as Error).message);
    }
  }

  // Stage 6: Fallback (unresolved)
  return {
    employerUrl: null,
    isAggregator: true,
    isAtsPlatform: false,
    isGovernmentPortal: false,
    method: 'unresolved',
  };
}

/**
 * Synchronous helper for the scraper insert pipeline.
 * Classifies a URL without fetching — used to populate isAggregatorSource
 * at insert time when we haven't yet resolved the full employer URL.
 */
export function classifySourceUrl(sourceUrl: string): {
  isAggregatorSource: boolean;
  quickEmployerUrl: string | null;
} {
  if (isEmployerUrl(sourceUrl)) {
    // Already an employer URL — use it directly
    return { isAggregatorSource: false, quickEmployerUrl: sourceUrl };
  }
  // Known aggregator — needs async resolution
  return { isAggregatorSource: true, quickEmployerUrl: null };
}

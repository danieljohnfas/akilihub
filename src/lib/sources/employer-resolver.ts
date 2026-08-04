/**
 * EMPLOYER URL RESOLVER
 *
 * Given a URL (which may point to an aggregator, ATS platform, or employer
 * directly), resolves and returns the canonical employer/authority URL.
 *
 * Resolution strategy:
 *  1. ATS platform → return as-is (it IS the employer's system)
 *  2. Government portal → return as-is (it IS the authority)
 *  3. Unknown domain (not in registry) → return as-is (assume employer)
 *  4. Known aggregator → fetch page, extract the real employer link:
 *      a. Parse all outbound links from page HTML
 *      b. Filter to non-aggregator links
 *      c. Score by proximity to "Apply", "Original Posting", employer keywords
 *      d. Return highest-scoring link, or null if none found confidently
 */

import { fetchHtml } from '@/lib/scrapers/compliance-base';
import { isAggregatorUrl, isAtsPlatform, isGovernmentPortal, isEmployerUrl, getAllAggregatorDomains } from './aggregators';

// ── Link-text signals that indicate a direct employer link or official document ─────
const EMPLOYER_LINK_SIGNALS = [
  'apply',
  'apply now',
  'apply here',
  'apply on',
  'original posting',
  'official website',
  'company website',
  'employer website',
  'view on employer',
  'apply on employer',
  'visit website',
  'apply via',
  'apply directly',
  'go to application',
  'external link',
  'apply online',
  'apply for this job',
  'application link',
  'download advert',
  'download pdf',
  'download document',
  'download flyer',
  'view poster',
  'job poster',
  'tender flyer',
  'job specification',
  'tender document',
  'official announcement',
  'terms of reference',
  'full advert',
  'tangazo',        // Swahili: "announcement/advert"
  'tovuti',         // Swahili: "website"
  'pakua',          // Swahili: "download"
  'ona tangazo',    // Swahili: "view advert"
  'pakua tangazo',  // Swahili: "download advert"
  'postuler',       // French: "apply"
  'candidature',    // French: "application"
  'soumettre',      // French: "submit"
  'télécharger',    // French: "download"
  'apply at',
  'see original',
  'source',
];

// ── Domains to exclude from resolved links (catch-all for aggregators) ────────
const AGGREGATOR_DOMAINS_SET = new Set(getAllAggregatorDomains());

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function isExcludedDomain(url: string): boolean {
  const domain = extractDomain(url);
  if (!domain) return true;
  // Exact match or subdomain match
  return AGGREGATOR_DOMAINS_SET.has(domain) ||
    [...AGGREGATOR_DOMAINS_SET].some(d => domain.endsWith('.' + d));
}

/**
 * Parses all external links from raw HTML, scoring them by likelihood of being
 * the true employer/authority URL or official attachment document. Returns scored
 * candidates sorted by score desc.
 */
function extractCandidateLinks(
  html: string,
  baseUrl: string,
): Array<{ url: string; score: number; text: string }> {
  const candidates: Array<{ url: string; score: number; text: string }> = [];

  // Match all <a href="..."> with their surrounding text
  const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRegex.exec(html)) !== null) {
    const rawHref = match[1].trim();
    const linkText = match[2].replace(/<[^>]+>/g, ' ').trim().toLowerCase();

    // Resolve relative URLs
    let resolvedUrl: string;
    try {
      resolvedUrl = new URL(rawHref, baseUrl).href;
    } catch {
      continue;
    }

    // Must be http/https
    if (!resolvedUrl.startsWith('http')) continue;

    // Skip same-domain links (they're navigational on the aggregator itself)
    const baseDomain = extractDomain(baseUrl);
    const linkDomain = extractDomain(resolvedUrl);
    if (linkDomain === baseDomain) continue;

    // Skip excluded aggregator domains
    if (isExcludedDomain(resolvedUrl)) continue;

    // Score by link text signals
    let score = 0;
    for (const signal of EMPLOYER_LINK_SIGNALS) {
      if (linkText.includes(signal)) {
        score += signal.split(' ').length; // longer matches score higher
      }
    }

    // Bonus: ATS platform links are very likely the real destination
    if (isAtsPlatform(resolvedUrl)) score += 10;
    // Bonus: government portals
    if (isGovernmentPortal(resolvedUrl)) score += 8;
    // Bonus: official document or image flyer attachments (.pdf, .docx, .doc, .xlsx, .png, .jpg, .webp)
    if (/\.(pdf|docx?|xlsx?|png|jpe?g|webp)(\?.*)?$/i.test(resolvedUrl)) score += 7;
    // Bonus: .go.XX, .gov.XX domains (government)
    if (/\.(go|gov)\.[a-z]{2,3}$/.test(linkDomain)) score += 6;
    // Bonus: .org domains (NGOs, nonprofits)
    if (linkDomain.endsWith('.org')) score += 2;
    // Slight boost for any non-aggregator external link
    if (score === 0) score = 1;

    candidates.push({ url: resolvedUrl, score, text: linkText });
  }

  // Also look for plain-text URLs that aren't in anchor tags
  // (some aggregators paste the employer URL as text)
  const plainUrlRegex = /https?:\/\/[^\s"'<>)]+/g;
  const existingUrls = new Set(candidates.map(c => c.url));
  const plainMatches = html.match(plainUrlRegex) ?? [];

  for (const rawUrl of plainMatches) {
    if (existingUrls.has(rawUrl)) continue;
    const domain = extractDomain(rawUrl);
    if (!domain || domain === extractDomain(baseUrl)) continue;
    if (isExcludedDomain(rawUrl)) continue;

    let score = 1;
    if (isAtsPlatform(rawUrl)) score += 8;
    if (isGovernmentPortal(rawUrl)) score += 6;
    if (/\.(go|gov)\.[a-z]{2,3}$/.test(domain)) score += 5;
    candidates.push({ url: rawUrl, score, text: '' });
    existingUrls.add(rawUrl);
  }

  return candidates.sort((a, b) => b.score - a.score);
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
}

/**
 * Resolves a source URL to the canonical employer/authority URL.
 *
 * This is the primary entry point used by:
 *  - The retroactive backfill job (resolve-employer-urls.ts)
 *  - The forward scraping pipeline (broad-search-engine.ts)
 *
 * Returns null for employerUrl if we cannot confidently determine the
 * employer URL (e.g. aggregator page has no external links, or fetch failed).
 */
export async function resolveEmployerUrl(sourceUrl: string): Promise<ResolvedEmployerUrl> {
  const _isAtsPlatform = isAtsPlatform(sourceUrl);
  const _isGovPortal = isGovernmentPortal(sourceUrl);
  const _isAggregator = isAggregatorUrl(sourceUrl);

  // Case 1: ATS platform → IS the employer URL
  if (_isAtsPlatform) {
    return { employerUrl: sourceUrl, isAggregator: false, isAtsPlatform: true, isGovernmentPortal: false };
  }

  // Case 2: Government portal → IS the employer URL
  if (_isGovPortal) {
    return { employerUrl: sourceUrl, isAggregator: false, isAtsPlatform: false, isGovernmentPortal: true };
  }

  // Case 3: Not a known aggregator → already an employer URL
  if (!_isAggregator) {
    return { employerUrl: sourceUrl, isAggregator: false, isAtsPlatform: false, isGovernmentPortal: false };
  }

  // Case 4: Known aggregator — fetch and resolve
  try {
    const html = await fetchHtml(sourceUrl);
    if (!html) {
      return { employerUrl: null, isAggregator: true, isAtsPlatform: false, isGovernmentPortal: false };
    }

    const candidates = extractCandidateLinks(html, sourceUrl);

    if (candidates.length === 0) {
      return { employerUrl: null, isAggregator: true, isAtsPlatform: false, isGovernmentPortal: false };
    }

    // Accept the top candidate if it has a meaningful score
    const best = candidates[0];
    if (best.score < 1) {
      return { employerUrl: null, isAggregator: true, isAtsPlatform: false, isGovernmentPortal: false };
    }

    return {
      employerUrl: best.url,
      isAggregator: true,
      isAtsPlatform: isAtsPlatform(best.url),
      isGovernmentPortal: isGovernmentPortal(best.url),
    };
  } catch (err) {
    console.error(`[employer-resolver] Failed to resolve ${sourceUrl}:`, (err as Error).message);
    return { employerUrl: null, isAggregator: true, isAtsPlatform: false, isGovernmentPortal: false };
  }
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

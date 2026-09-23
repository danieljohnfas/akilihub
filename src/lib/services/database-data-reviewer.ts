import * as cheerio from 'cheerio';
import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { complianceRequirements } from '@/lib/db/schema/compliance';
import { eq, and, isNull, or, sql } from 'drizzle-orm';
import {
  isJevAvailable,
  getJevClient,
  scoreQuality,
  isRelevantOpportunity,
} from '@/lib/ai/jev-client';
import { choice, score, noul } from '@typesafe-ai/sdk';
import {
  extractStructuredRequirements,
  extractDeadlineFromText,
  extractSalaryFromText,
  isLegitimateEmployerUrl,
  BANNED_EMPLOYER_DOMAINS,
} from '@/lib/scrapers/deterministic-extractor';
import { isAggregatorUrl, isAtsPlatform, isEmployerUrl } from '@/lib/sources/aggregators';

export interface DataReviewResult {
  id: string;
  module: 'jobs' | 'tenders' | 'compliance';
  status: 'already_adheres' | 'enriched' | 'aggregator_resolved' | 'deactivated' | 'failed';
  originalQuality?: string;
  newQuality?: string;
  fieldsUpdated: string[];
  resolvedEmployerUrl?: string | null;
  reason?: string;
}

export interface ReviewBatchOptions {
  module?: 'jobs' | 'tenders' | 'compliance';
  limit?: number;
  offset?: number;
  aggregatorsOnly?: boolean;
  dryRun?: boolean;
}

/**
 * Common user-agent for web fetches
 */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Fetches HTML with a safe timeout and custom user-agent.
 */
export async function fetchPageHtml(url: string, timeoutMs = 8000): Promise<string | null> {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;

  // Skip direct binary files (PDFs, archives, docs) — not HTML pages
  if (/\.(pdf|docx?|xlsx?|pptx?|zip|rar|tar|gz|exe|apk)(\?.*)?$/i.test(url)) {
    return null;
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,sw;q=0.8',
      },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });

    if (!res.ok) {
      console.warn(`[DataReviewer] Failed to fetch ${url} - Status ${res.status}`);
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    if (
      contentType &&
      !contentType.includes('text/html') &&
      !contentType.includes('application/xhtml+xml') &&
      !contentType.includes('text/plain')
    ) {
      return null;
    }

    const html = await res.text();
    return html && html.length > 100 ? html : null;
  } catch (err) {
    console.warn(`[DataReviewer] Error fetching ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Searches the HTML for canonical, direct employer ATS or application links.
 */
export function extractDirectEmployerLinks(html: string, pageUrl: string): string[] {
  const $ = cheerio.load(html);
  const candidates: string[] = [];

  // ATS domains to search for explicitly
  const atsDomains = [
    'workable.com',
    'greenhouse.io',
    'lever.co',
    'myworkdayjobs.com',
    'bamboohr.com',
    'smartrecruiters.com',
    'oraclecloud.com',
    'applytojob.com',
    'taleo.net',
    'recruitee.com',
    'ashbyhq.com',
    'forms.gle',
    'typeform.com',
  ];

  $('a').each((_, el) => {
    let href = $(el).attr('href')?.trim();
    if (!href) return;

    // Handle relative URLs
    try {
      if (href.startsWith('/')) {
        const base = new URL(pageUrl);
        href = `${base.origin}${href}`;
      }
    } catch {}

    const text = $(el).text().trim().toLowerCase();
    const lowerHref = href.toLowerCase();

    // Priority 1: Recognized ATS platform link
    if (atsDomains.some(domain => lowerHref.includes(domain))) {
      candidates.unshift(href);
      return;
    }

    // Priority 2: Links with apply/career anchor text pointing outside the current aggregator domain
    const isApplyAnchor =
      text.includes('apply on company website') ||
      text.includes('apply here') ||
      text.includes('official website') ||
      text.includes('submit your cv on company website') ||
      text.includes('apply online') ||
      text.includes('careers page');

    if (isApplyAnchor && isLegitimateEmployerUrl(href) && !isAggregatorUrl(href)) {
      candidates.push(href);
    }
  });

  // Filter and deduplicate
  const cleanCandidates = Array.from(new Set(candidates)).filter(url => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
      if (BANNED_EMPLOYER_DOMAINS.some(banned => host.includes(banned) || host.endsWith(banned))) {
        return false;
      }
      return url.startsWith('http');
    } catch {
      return false;
    }
  });

  return cleanCandidates;
}

/**
 * Decodes Cloudflare email obfuscation hex string.
 */
export function decodeCloudflareEmail(hex: string): string | null {
  try {
    let email = '';
    const r = parseInt(hex.substring(0, 2), 16);
    for (let n = 2; n < hex.length; n += 2) {
      email += String.fromCharCode(parseInt(hex.substring(n, 2), 16) ^ r);
    }
    return email.includes('@') ? email.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Extracts true company name from title or description when the stored company is 'TRA' or generic.
 */
export function extractCompanyFromTitleOrText(title: string, text?: string | null): string | null {
  if (!title) return null;

  // 1. Check title patterns like "Company — Role" or "Company - Role"
  const dashMatch = title.match(/^([A-Za-z0-9&.,'\s]{3,40}?)\s+[—–-]\s+/);
  if (dashMatch && dashMatch[1].trim()) {
    const candidate = dashMatch[1].trim();
    if (!/^(internship|vacancy|job|urgent|hiring|remote|fresh|tenders?|recruitment)/i.test(candidate)) {
      return candidate;
    }
  }

  // 2. Patterns like "Role at Company" or "Role Job Vacancy at Company"
  const atMatch = title.match(/(?:at|for)\s+([A-Za-z0-9&.,'\s]{3,50})$/i);
  if (atMatch && atMatch[1].trim()) {
    return atMatch[1].trim().replace(/\s+(?:Tanzania|Kenya|Uganda|Rwanda|Ethiopia)$/i, '');
  }

  // 3. Look in description for "Organization: Company" or "Company: Company"
  if (text) {
    const orgMatch = text.match(/(?:Organization|Company|Employer)[:\s]+([A-Za-z0-9&.,'\s]{3,50})(?:\n|\r|$)/i);
    if (orgMatch && orgMatch[1].trim()) {
      return orgMatch[1].trim();
    }
  }

  return null;
}

/**
 * Extracts a clean, ad-free text description and structured fields from HTML.
 */
export function extractCleanJobFields(html: string, pageUrl: string) {
  const $ = cheerio.load(html);

  // Decode any Cloudflare-obfuscated emails before stripping elements
  const decodedEmails: string[] = [];
  $('[data-cfemail]').each((_, el) => {
    const enc = $(el).attr('data-cfemail');
    if (enc) {
      const email = decodeCloudflareEmail(enc);
      if (email) {
        decodedEmails.push(email);
        $(el).replaceWith(email);
      }
    }
  });

  // Strip script, style, nav, footer, ad tags, iframe
  $('script, style, nav, footer, header, .ads, ins, iframe, .sidebar, .comments, .related-posts, .share-buttons').remove();

  // Remove common Google Ads and aggregator banners
  $('*').each((_, el) => {
    const text = $(el).text();
    if (text.includes('adsbygoogle') || text.includes('Recruit candidates with Ease')) {
      $(el).remove();
    }
  });

  let fullText = $('body').text().replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();

  // Also replace any remaining raw [email protected] if we decoded an application email
  const appEmail = decodedEmails.find(
    e => !e.includes('ajirayako') && !e.includes('jobweb') && !e.includes('brightermonday') && !e.includes('admin@') && !e.includes('support@')
  );
  if (appEmail) {
    fullText = fullText.replace(/\[email\s*protected\]/gi, appEmail);
  }

  // Pre-process date OCR errors (e.g. O7/02/2026 -> 07/02/2026)
  const sanitizedText = fullText.replace(/\bO(\d[\/\-]\d{1,2}[\/\-]\d{4})\b/g, '0$1');

  // 1. Requirements extraction
  const structuredReqs = extractStructuredRequirements(sanitizedText);

  // 2. Deadline extraction
  const deadline = extractDeadlineFromText(sanitizedText);

  // 3. Salary extraction
  const salary = extractSalaryFromText(sanitizedText);

  // 4. Direct employer links
  const directLinks = extractDirectEmployerLinks(html, pageUrl);

  // 5. Derive employer URL from company email domain if direct link not found
  if (directLinks.length === 0 && appEmail) {
    const domain = appEmail.split('@')[1];
    const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'mail.com', 'yandex.com', 'icloud.com'];
    if (domain && !freeProviders.includes(domain)) {
      directLinks.push(`https://www.${domain}`);
    }
  }

  return {
    cleanText: fullText.substring(0, 3000),
    requirements: structuredReqs,
    deadline,
    salary,
    directEmployerUrl: directLinks[0] || null,
    applicationEmail: appEmail || null,
  };
}

/**
 * Uses Jev System One to review a record against data standards.
 */
export async function reviewRecordWithJev(stateText: string) {
  const client = getJevClient();
  if (!client) return null;

  try {
    const res = await client.systemOne(
      {
        state: stateText.substring(0, 4000),
        questions: {
          quality: score('Rate the completeness and quality of this opportunity listing:', [
            'Empty or broken - text is missing, corrupted, or consists of cookie/navigation boilerplate with no real details',
            'Shallow - brief description under a couple sentences, missing requirements, responsibilities, or clear dates',
            'Adequate - provides standard description and core details about the role, tender, or compliance notice',
            'Rich - in-depth, structured opportunity with comprehensive responsibilities, qualifications, dates, and actionable instructions',
          ]),
          isAggregator: noul(
            'Is this listing sourced from an aggregator/directory website rather than the direct employer portal or authority?'
          ),
          isLegitimate: noul(
            'Is this an active, legitimate opportunity that an applicant or organization can act upon?'
          ),
        },
      },
      { timeout: 10_000 }
    );

    const qualityAnswer = res.answers.quality;
    const isAggregatorAnswer = res.answers.isAggregator;
    const isLegitAnswer = res.answers.isLegitimate;

    const levels = ['empty', 'shallow', 'adequate', 'rich'] as const;
    const roundedScore = Math.max(0, Math.min(3, Math.round(qualityAnswer.score)));

    return {
      qualityScore: qualityAnswer.score,
      qualityLevel: levels[roundedScore] || 'adequate',
      isAggregatorProb: isAggregatorAnswer.noul ?? 0.5,
      isAggregator: (isAggregatorAnswer.noul ?? 0) >= 0.6,
      isLegitimateProb: isLegitAnswer.noul ?? 0.5,
      isLegitimate: (isLegitAnswer.noul ?? 0) >= 0.4, // Keep unless confirmed invalid (< 0.4)
    };
  } catch (err) {
    console.warn('[DataReviewer] Jev review query failed:', err);
    return null;
  }
}

/**
 * Reviews and enriches a single Job record.
 */
export async function reviewAndEnrichJob(
  job: {
    id: string;
    title: string;
    companyName: string | null;
    description: string | null;
    requirements: string | null;
    deadline: Date | null;
    sourceUrl: string;
    employerUrl: string | null;
    isAggregatorSource: boolean | null;
  },
  options: { dryRun?: boolean } = {}
): Promise<DataReviewResult> {
  const fieldsUpdated: string[] = [];
  const initialText = `Title: ${job.title}\nCompany: ${job.companyName || ''}\nDescription: ${job.description || ''}\nRequirements: ${job.requirements || ''}`;

  // 1. Initial review with Jev
  const review = await reviewRecordWithJev(initialText);
  const isAggregator =
    job.isAggregatorSource ||
    isAggregatorUrl(job.sourceUrl) ||
    (review?.isAggregator ?? false);

  const needsRequirements = !job.requirements || job.requirements.trim().length < 40;
  const needsDeadline = !job.deadline;
  const needsEmployerUrl = !job.employerUrl || isAggregatorUrl(job.employerUrl);
  const isShallow = (job.description?.length ?? 0) < 300 || review?.qualityLevel === 'shallow' || review?.qualityLevel === 'empty';

  // If already rich, has direct employer URL, requirements, and deadline:
  if (!needsRequirements && !needsDeadline && !needsEmployerUrl && !isShallow && !isAggregator) {
    return {
      id: job.id,
      module: 'jobs',
      status: 'already_adheres',
      originalQuality: review?.qualityLevel,
      fieldsUpdated: [],
    };
  }

  // 2. Determine target URL to fetch for additional information
  const targetFetchUrl = (job.employerUrl && isEmployerUrl(job.employerUrl)) ? job.employerUrl : job.sourceUrl;

  const html = await fetchPageHtml(targetFetchUrl);
  let extracted: ReturnType<typeof extractCleanJobFields>;

  if (html) {
    extracted = extractCleanJobFields(html, targetFetchUrl);
  } else if (job.description && job.description.length > 50) {
    // Fallback extraction from stored description if external fetch fails/times out
    const sanitizedDesc = job.description.replace(/\bO(\d[\/\-]\d{1,2}[\/\-]\d{4})\b/g, '0$1');
    extracted = {
      cleanText: job.description,
      requirements: extractStructuredRequirements(sanitizedDesc),
      deadline: extractDeadlineFromText(sanitizedDesc),
      salary: extractSalaryFromText(sanitizedDesc),
      directEmployerUrl: null,
      applicationEmail: null,
    };
  } else {
    return {
      id: job.id,
      module: 'jobs',
      status: 'failed',
      originalQuality: review?.qualityLevel,
      fieldsUpdated: [],
      reason: `Could not fetch source HTML from ${targetFetchUrl} and stored description is empty`,
    };
  }

  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  // Company Name Correction (e.g. fix 'TRA' scraper glitch or generic company names)
  if (job.companyName === 'TRA' || !job.companyName || job.companyName.trim() === '') {
    const candidateCompany = extractCompanyFromTitleOrText(job.title, job.description);
    if (candidateCompany && candidateCompany !== job.companyName) {
      updatePayload.companyName = candidateCompany;
      fieldsUpdated.push('companyName');
    }
  }

  // Direct employer URL resolution
  let resolvedEmployerUrl = job.employerUrl;
  if (extracted.directEmployerUrl && (!job.employerUrl || isAggregatorUrl(job.employerUrl))) {
    resolvedEmployerUrl = extracted.directEmployerUrl;
    updatePayload.employerUrl = extracted.directEmployerUrl;
    updatePayload.isAggregatorSource = false;
    fieldsUpdated.push('employerUrl', 'isAggregatorSource');
  } else if (isAtsPlatform(job.sourceUrl) || isEmployerUrl(job.sourceUrl)) {
    resolvedEmployerUrl = job.sourceUrl;
    updatePayload.employerUrl = job.sourceUrl;
    updatePayload.isAggregatorSource = false;
    fieldsUpdated.push('employerUrl', 'isAggregatorSource');
  }

  // Requirements enrichment
  if (needsRequirements && extracted.requirements) {
    updatePayload.requirements = extracted.requirements;
    fieldsUpdated.push('requirements');
  }

  // Deadline enrichment & expiration check
  if (extracted.deadline) {
    if (needsDeadline) {
      updatePayload.deadline = extracted.deadline;
      fieldsUpdated.push('deadline');
    }
    // Deactivate stale/expired jobs
    if (extracted.deadline < new Date()) {
      updatePayload.isActive = false;
      fieldsUpdated.push('isActive(expired)');
    }
  }

  // Replace [email protected] in description with decoded application email
  if (extracted.applicationEmail && job.description && job.description.includes('[email protected]')) {
    updatePayload.description = (updatePayload.description as string || job.description).replace(
      /\[email\s*protected\]/gi,
      extracted.applicationEmail
    );
    fieldsUpdated.push('description(decoded_email)');
  }

  // Salary enrichment
  if (extracted.salary.salaryMin && extracted.salary.salaryCurrency) {
    updatePayload.salaryMin = extracted.salary.salaryMin.toString();
    updatePayload.salaryMax = extracted.salary.salaryMax ? extracted.salary.salaryMax.toString() : null;
    updatePayload.salaryCurrency = extracted.salary.salaryCurrency;
    fieldsUpdated.push('salaryMin', 'salaryMax', 'salaryCurrency');
  }

  // Clean description if original was shallow or contained spam
  if (isShallow && extracted.cleanText.length > (job.description?.length ?? 0)) {
    updatePayload.description = extracted.cleanText;
    fieldsUpdated.push('description');
  }

  // Check legitimacy with Jev
  if (review && !review.isLegitimate && review.isLegitimateProb < 0.25) {
    updatePayload.isActive = false;
    fieldsUpdated.push('isActive(deactivated)');
  }

  // 4. Update Database
  if (fieldsUpdated.length > 0 && !options.dryRun) {
    await safeQuery(
      db.update(jobs).set(updatePayload).where(eq(jobs.id, job.id)),
      10000,
      `Update enriched job ${job.id}`
    );
  }

  return {
    id: job.id,
    module: 'jobs',
    status: fieldsUpdated.includes('employerUrl') ? 'aggregator_resolved' : 'enriched',
    originalQuality: review?.qualityLevel,
    newQuality: 'adequate',
    fieldsUpdated,
    resolvedEmployerUrl,
  };
}

/**
 * Reviews and enriches a batch of jobs.
 */
export async function reviewJobsBatch(options: ReviewBatchOptions = {}) {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  let query = db
    .select({
      id: jobs.id,
      title: jobs.title,
      companyName: jobs.companyName,
      description: jobs.description,
      requirements: jobs.requirements,
      deadline: jobs.deadline,
      sourceUrl: jobs.sourceUrl,
      employerUrl: jobs.employerUrl,
      isAggregatorSource: jobs.isAggregatorSource,
    })
    .from(jobs)
    .where(
      options.aggregatorsOnly
        ? and(eq(jobs.isActive, true), eq(jobs.isAggregatorSource, true))
        : and(
            eq(jobs.isActive, true),
            or(
              isNull(jobs.requirements),
              isNull(jobs.deadline),
              isNull(jobs.employerUrl),
              eq(jobs.isAggregatorSource, true)
            )
          )
    )
    .limit(limit)
    .offset(offset);

  const candidateJobs = await safeQuery(query, 15000, 'Fetch candidate jobs for review');
  console.log(`[DataReviewer] Fetched ${candidateJobs.length} candidate jobs to review.`);

  const results: DataReviewResult[] = [];

  for (const job of candidateJobs) {
    const result = await reviewAndEnrichJob(job, { dryRun: options.dryRun });
    results.push(result);
    // Slight pause to prevent hammering external sites
    await new Promise(r => setTimeout(r, 400));
  }

  const summary = {
    totalProcessed: results.length,
    alreadyAdheres: results.filter(r => r.status === 'already_adheres').length,
    enriched: results.filter(r => r.status === 'enriched').length,
    aggregatorsResolved: results.filter(r => r.status === 'aggregator_resolved').length,
    failed: results.filter(r => r.status === 'failed').length,
  };

  return { summary, results };
}

import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import { z } from 'zod';
import { isSafeHttpUrl } from '@/lib/security/safe-url';

/**
 * Declarative parsers for job-listing pages.
 *
 * Previously the pipeline asked an LLM to write JavaScript from untrusted HTML, ran it in
 * `node:vm` (not a security boundary) and auto-committed the result to `main`. A prompt-injected
 * page could therefore become code execution on CI and production.
 *
 * Now the LLM only returns a small JSON *spec* (CSS selectors). It is validated with zod and
 * interpreted by this module with cheerio — there is nothing to execute.
 */

export const JOB_FIELDS = [
  'title',
  'companyName',
  'description',
  'location',
  'jobType',
  'sourceUrl',
  'postedDateIsoString',
  'deadlineIsoString',
  'salaryMin',
  'salaryMax',
  'salaryCurrency',
] as const;
export type JobField = (typeof JOB_FIELDS)[number];

const FieldSpecSchema = z.object({
  /** CSS selector relative to the job container. Empty string = the container itself. */
  selector: z.string().max(200).default(''),
  /** Attribute to read (e.g. `href`, `datetime`, `content`). Omit / `text` reads the text content. */
  attr: z
    .string()
    .max(40)
    .regex(/^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/)
    .optional(),
});

export const ParserSpecSchema = z.object({
  /** False when the page is not a list of real job postings (directory, article, categories…). */
  isJobListing: z.boolean(),
  /** CSS selector matching one element per job posting. */
  container: z.string().max(300).default(''),
  fields: z
    .object({
      title: FieldSpecSchema.optional(),
      companyName: FieldSpecSchema.optional(),
      description: FieldSpecSchema.optional(),
      location: FieldSpecSchema.optional(),
      jobType: FieldSpecSchema.optional(),
      sourceUrl: FieldSpecSchema.optional(),
      postedDateIsoString: FieldSpecSchema.optional(),
      deadlineIsoString: FieldSpecSchema.optional(),
      salaryMin: FieldSpecSchema.optional(),
      salaryMax: FieldSpecSchema.optional(),
      salaryCurrency: FieldSpecSchema.optional(),
    })
    .default({}),
});

export type ParserSpec = z.infer<typeof ParserSpecSchema>;

export interface ParsedJob {
  title: string;
  companyName?: string | null;
  description?: string | null;
  location?: string | null;
  jobType?: string | null;
  sourceUrl?: string | null;
  postedDateIsoString?: string | null;
  deadlineIsoString?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
}

const MAX_ITEMS = 200;
const LIMITS: Partial<Record<JobField, number>> = {
  title: 300,
  companyName: 200,
  description: 30_000,
  location: 200,
  sourceUrl: 2048,
  salaryCurrency: 10,
};

export function getStructuralFingerprint(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, svg, iframe, noscript').remove();

  $('*')
    .contents()
    .filter((_, node) => node.type === 'text' || node.type === 'comment')
    .remove();

  $('*').each((_, el) => {
    const node = el as unknown as { attribs?: Record<string, string> };
    if (node.attribs) {
      const cls = node.attribs['class'];
      const id = node.attribs['id'];
      node.attribs = {};
      if (cls) node.attribs['class'] = cls;
      if (id) node.attribs['id'] = id;
    }
  });

  // Not a security use: just a cache key for "pages with the same skeleton".
  return createHash('md5').update($.html()).digest('hex');
}

function normalizeJobType(raw: string): string | null {
  const t = raw.toLowerCase();
  if (/full[\s_-]?time|permanent/.test(t)) return 'full_time';
  if (/part[\s_-]?time/.test(t)) return 'part_time';
  if (/contract|consult|temporary|fixed[\s_-]?term/.test(t)) return 'contract';
  if (/intern|attach?ment|apprentice|trainee/.test(t)) return 'internship';
  if (/remote|work from home/.test(t)) return 'remote';
  return null;
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readField(container: cheerio.Cheerio<any>, spec: { selector: string; attr?: string } | undefined): string {
  if (!spec) return '';
  try {
    const target = spec.selector ? container.find(spec.selector).first() : container;
    if (!target.length) return '';
    const raw = spec.attr && spec.attr !== 'text' ? target.attr(spec.attr) ?? '' : target.text();
    return raw.replace(/\s+/g, ' ').trim();
  } catch {
    // Invalid selector produced by the model — treat the field as absent.
    return '';
  }
}

/** Runs a validated spec against HTML. Pure and side-effect free. */
export function runParserSpec(spec: ParserSpec, html: string, baseUrl: string): ParsedJob[] {
  if (!spec.isJobListing || !spec.container) return [];

  const $ = cheerio.load(html);
  let elements: Array<cheerio.Cheerio<any>> = [];
  try {
    elements = $(spec.container)
      .toArray()
      .slice(0, MAX_ITEMS)
      .map((el) => $(el));
  } catch {
    return [];
  }

  const jobs: ParsedJob[] = [];
  for (const el of elements) {
    const text = (f: JobField) => readField(el, spec.fields?.[f]);

    const title = text('title').slice(0, LIMITS.title);
    if (!title) continue;

    let sourceUrl: string | null = null;
    const rawUrl = text('sourceUrl');
    if (rawUrl) {
      try {
        const abs = new URL(rawUrl, baseUrl).toString();
        sourceUrl = isSafeHttpUrl(abs) ? abs.slice(0, LIMITS.sourceUrl) : null;
      } catch {
        sourceUrl = null;
      }
    }

    const description = text('description').slice(0, LIMITS.description);
    jobs.push({
      title,
      companyName: text('companyName').slice(0, LIMITS.companyName) || null,
      description: description || null,
      location: text('location').slice(0, LIMITS.location) || null,
      jobType: normalizeJobType(text('jobType')),
      sourceUrl,
      postedDateIsoString: text('postedDateIsoString') || null,
      deadlineIsoString: text('deadlineIsoString') || null,
      salaryMin: parseNumber(text('salaryMin')),
      salaryMax: parseNumber(text('salaryMax')),
      salaryCurrency: text('salaryCurrency').slice(0, LIMITS.salaryCurrency) || null,
    });
  }
  return jobs;
}

/** True when the spec's selectors are at least syntactically valid against this HTML. */
export function specIsUsable(spec: ParserSpec, html: string): boolean {
  if (!spec.isJobListing) return true; // a valid "not a job page" verdict
  if (!spec.container) return false;
  try {
    const $ = cheerio.load(html);
    void $(spec.container).length; // throws on an invalid selector
    for (const f of JOB_FIELDS) {
      const s = spec.fields?.[f]?.selector;
      if (s) void $.root().find(s).length;
    }
    return true;
  } catch {
    return false;
  }
}

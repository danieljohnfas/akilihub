import { z } from 'zod';
import { and, desc, eq, gte, ilike, isNull, or } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { businesses } from '@/lib/db/schema/compliance';
import { countries, regions } from '@/lib/db/schema/shared';
import { escapeLike } from '@/lib/db/like';

/** Cleans a model-supplied search keyword: trimmed, length-capped, wildcards escaped. */
export function toLikePattern(keyword: string): string {
  return `%${escapeLike(keyword.trim().slice(0, 100))}%`;
}

const keywordSchema = (description: string) => z.object({ keyword: z.string().min(1).max(200).describe(description) });

/**
 * Read-only tools exposed to the chat model (AI SDK v7 shape: `inputSchema`, not `parameters`).
 */
export function buildChatTools() {
  return {
    searchJobs: {
      description: 'Search for jobs in the database by keyword or location',
      inputSchema: keywordSchema('Keyword to search for in job titles or descriptions (e.g. "software", "Nairobi", "driver")'),
      execute: async ({ keyword }: { keyword: string }) => {
        const pattern = toLikePattern(keyword);
        return db
          .select({
            title: jobs.title,
            company: jobs.companyName,
            region: regions.name,
            country: countries.name,
            url: jobs.sourceUrl,
            posted: jobs.postedDate,
          })
          .from(jobs)
          .leftJoin(countries, eq(jobs.countryId, countries.id))
          .leftJoin(regions, eq(jobs.regionId, regions.id))
          .where(and(eq(jobs.isActive, true), or(ilike(jobs.title, pattern), ilike(jobs.description, pattern))))
          .orderBy(desc(jobs.postedDate))
          .limit(10);
      },
    },
    searchTenders: {
      description: 'Search for open government tenders by keyword',
      inputSchema: keywordSchema('Keyword to search for in tender titles or descriptions (e.g. "construction", "computers", "Dodoma")'),
      execute: async ({ keyword }: { keyword: string }) => {
        const pattern = toLikePattern(keyword);
        return db
          .select({
            title: tenders.title,
            authority: tenders.contractingAuthority,
            status: tenders.status,
            url: tenders.sourceUrl,
            deadline: tenders.deadline,
          })
          .from(tenders)
          .where(
            and(
              eq(tenders.status, 'open'),
              or(isNull(tenders.deadline), gte(tenders.deadline, new Date())),
              or(ilike(tenders.title, pattern), ilike(tenders.description, pattern))
            )
          )
          .orderBy(desc(tenders.publishedAt))
          .limit(10);
      },
    },
    searchCompliance: {
      description: 'Search for registered businesses to check their compliance status',
      inputSchema: keywordSchema('Name of the company or registration number'),
      execute: async ({ keyword }: { keyword: string }) => {
        return db
          .select({ name: businesses.name, regNumber: businesses.registrationNumber, status: businesses.status })
          .from(businesses)
          .where(ilike(businesses.name, toLikePattern(keyword)))
          .limit(10);
      },
    },
  };
}

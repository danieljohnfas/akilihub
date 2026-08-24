import { pgTable, text, timestamp, uuid, boolean, pgEnum, index, numeric } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { countries, regions } from './shared';

export const jobTypeEnum = pgEnum('job_type', ['full_time', 'part_time', 'contract', 'internship', 'remote']);

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  companyName: text('company_name').notNull(),
  description: text('description').notNull(),
  requirements: text('requirements'),
  location: text('location'),
  countryId: uuid('country_id').notNull().references(() => countries.id),
  regionId: uuid('region_id').references(() => regions.id),
  jobType: jobTypeEnum('job_type').default('full_time'),
  sourceUrl: text('source_url').notNull().unique(),
  postedDate: timestamp('posted_date'),
  deadline: timestamp('deadline'),
  // Salary fields — populated by scraper when the source page lists them
  salaryMin: numeric('salary_min', { precision: 14, scale: 2 }),
  salaryMax: numeric('salary_max', { precision: 14, scale: 2 }),
  salaryCurrency: text('salary_currency'), // ISO 4217, e.g. "KES", "TZS", "UGX"
  // Employer-first sourcing — resolved direct employer/authority URL
  employerUrl: text('employer_url'),              // resolved employer/ATS/authority URL (null = not yet resolved)
  
  // AI Extracted Entity Fields
  sector: text('sector'),
  profession: text('profession'),
  experienceLevel: text('experience_level'),
  educationLevel: text('education_level'),
  skills: text('skills').array(),
  
  isAggregatorSource: boolean('is_aggregator').notNull().default(false), // true if sourceUrl is an aggregator
  isActive: boolean('is_active').notNull().default(true),
  needsAiExtraction: boolean('needs_ai_extraction').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('jobs_country_idx').on(table.countryId),
  index('jobs_region_idx').on(table.regionId),
  index('jobs_deadline_idx').on(table.deadline),
  index('jobs_active_idx').on(table.isActive),
  index('jobs_created_at_idx').on(table.createdAt),
  index('jobs_needs_ai_idx').on(table.needsAiExtraction),
  index('jobs_search_idx').using('gin', sql`to_tsvector('english', ${table.title} || ' ' || coalesce(${table.description}, ''))`),
]);


import { pgTable, text, timestamp, uuid, boolean, pgEnum, index, numeric } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { countries } from './shared';

export const jobTypeEnum = pgEnum('job_type', ['full_time', 'part_time', 'contract', 'internship', 'remote']);

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  companyName: text('company_name').notNull(),
  description: text('description').notNull(),
  requirements: text('requirements'),
  location: text('location'),
  countryId: uuid('country_id').notNull().references(() => countries.id),
  jobType: jobTypeEnum('job_type').default('full_time'),
  sourceUrl: text('source_url').notNull().unique(),
  postedDate: timestamp('posted_date'),
  deadline: timestamp('deadline'),
  // Salary fields — populated by scraper when the source page lists them
  salaryMin: numeric('salary_min', { precision: 14, scale: 2 }),
  salaryMax: numeric('salary_max', { precision: 14, scale: 2 }),
  salaryCurrency: text('salary_currency'), // ISO 4217, e.g. "KES", "TZS", "UGX"
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('jobs_country_idx').on(table.countryId),
  index('jobs_deadline_idx').on(table.deadline),
  index('jobs_active_idx').on(table.isActive),
  index('jobs_search_idx').using('gin', sql`to_tsvector('english', ${table.title} || ' ' || coalesce(${table.description}, ''))`),
]);


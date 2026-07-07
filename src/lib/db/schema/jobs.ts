import { pgTable, text, timestamp, uuid, boolean, pgEnum, index } from 'drizzle-orm/pg-core';
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
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('jobs_country_idx').on(table.countryId),
  index('jobs_deadline_idx').on(table.deadline),
  index('jobs_active_idx').on(table.isActive),
]);

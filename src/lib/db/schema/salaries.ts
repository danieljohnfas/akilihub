import { pgTable, text, timestamp, uuid, numeric, integer, boolean, index, pgEnum } from 'drizzle-orm/pg-core';
import { countries } from './shared';

export const experienceLevelEnum = pgEnum('experience_level', ['entry', 'mid', 'senior', 'executive']);
export const employmentTypeEnum = pgEnum('employment_type', ['full_time', 'part_time', 'contract', 'consultancy']);

export const jobCategories = pgTable('job_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  parentId: uuid('parent_id'),
});

export const employers = pgTable('employers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  sector: text('sector'), // e.g. 'NGO', 'Government', 'Private'
  countryId: uuid('country_id').references(() => countries.id),
  isVerified: boolean('is_verified').notNull().default(false),
});

export const salarySubmissions = pgTable('salary_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobTitle: text('job_title').notNull(),
  jobCategoryId: uuid('job_category_id').references(() => jobCategories.id),
  employerId: uuid('employer_id').references(() => employers.id),
  countryId: uuid('country_id').notNull().references(() => countries.id),
  experienceLevel: experienceLevelEnum('experience_level').notNull(),
  employmentType: employmentTypeEnum('employment_type').notNull().default('full_time'),
  currency: text('currency').notNull().default('USD'),
  grossMonthlySalary: numeric('gross_monthly_salary', { precision: 12, scale: 2 }).notNull(),
  netMonthlySalary: numeric('net_monthly_salary', { precision: 12, scale: 2 }),
  yearsOfExperience: integer('years_of_experience'),
  isAnonymous: boolean('is_anonymous').notNull().default(true),
  isVerified: boolean('is_verified').notNull().default(false),
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
}, (table) => [
  index('salary_country_idx').on(table.countryId),
  index('salary_category_idx').on(table.jobCategoryId),
  index('salary_level_idx').on(table.experienceLevel),
]);
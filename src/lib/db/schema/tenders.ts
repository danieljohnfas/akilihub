import { pgTable, text, timestamp, uuid, numeric, integer, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { countries } from './shared';
import { sql } from 'drizzle-orm';

export const tenderStatusEnum = pgEnum('tender_status', ['open', 'closed', 'awarded', 'cancelled']);
export const tenderCategoryEnum = pgEnum('tender_category', ['goods', 'works', 'services', 'consultancy']);

export const tenderSectors = pgTable('tender_sectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
});

export const tenders = pgTable('tenders', {
  id: uuid('id').primaryKey().defaultRandom(),
  referenceNo: text('reference_no').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  contractingAuthority: text('contracting_authority').notNull(),
  countryId: uuid('country_id').notNull().references(() => countries.id),
  sectorId: uuid('sector_id').references(() => tenderSectors.id),
  category: tenderCategoryEnum('category').default('services'),
  status: tenderStatusEnum('status').notNull().default('open'),
  budget: numeric('budget', { precision: 18, scale: 2 }),
  currency: text('currency').default('USD'),
  publishedAt: timestamp('published_at'),
  deadline: timestamp('deadline').notNull(),
  sourceUrl: text('source_url').notNull().unique(),
  documentUrl: text('document_url'),
  extractedText: text('extracted_text'), // OCR text from Stirling PDF
  searchVector: text('search_vector'), // For FTS
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('tenders_country_idx').on(table.countryId),
  index('tenders_status_idx').on(table.status),
  index('tenders_deadline_idx').on(table.deadline),
  index('tenders_search_idx').using('gin', sql`to_tsvector('english', ${table.title} || ' ' || coalesce(${table.description}, ''))`),
]);
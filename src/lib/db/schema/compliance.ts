import { pgTable, text, timestamp, uuid, boolean, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { countries } from './shared';

export const complianceCategoryEnum = pgEnum('compliance_category', [
  'tax', 'business_registration', 'employment', 'environment', 'health_safety', 'sector_specific'
]);

export const complianceResourceTypeEnum = pgEnum('compliance_resource_type', [
  'form', 'calculator', 'guideline', 'notice'
]);

export const businessTypes = pgTable('business_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  countryId: uuid('country_id').references(() => countries.id),
});

export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  registrationNumber: text('registration_number').notNull().unique(),
  name: text('name').notNull(),
  typeId: uuid('type_id').references(() => businessTypes.id),
  countryId: uuid('country_id').notNull().references(() => countries.id),
  status: text('status').notNull().default('active'),
  registrationDate: timestamp('registration_date'),
  directors: text('directors').array(),
  address: text('address'),
  searchVector: text('search_vector'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const complianceRequirements = pgTable('compliance_requirements', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  countryId: uuid('country_id').notNull().references(() => countries.id),
  businessTypeId: uuid('business_type_id').references(() => businessTypes.id),
  category: complianceCategoryEnum('category').notNull(),
  issuingAuthority: text('issuing_authority').notNull(),
  renewalPeriodDays: text('renewal_period_days'),
  estimatedCost: text('estimated_cost'),
  requiredDocuments: text('required_documents').array(),
  sourceUrl: text('source_url'),
  resourceType: complianceResourceTypeEnum('resource_type').notNull().default('guideline'),
  isActive: boolean('is_active').notNull().default(true),
  lastVerifiedAt: timestamp('last_verified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('compliance_country_idx').on(table.countryId),
  index('compliance_category_idx').on(table.category),
  uniqueIndex('compliance_title_country_udx').on(table.title, table.countryId),
  index('compliance_req_search_idx').using('gin', sql`to_tsvector('english', ${table.title} || ' ' || coalesce(${table.description}, ''))`),
]);
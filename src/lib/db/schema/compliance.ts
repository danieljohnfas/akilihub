import { pgTable, text, timestamp, uuid, boolean, index, pgEnum } from 'drizzle-orm/pg-core';
import { countries } from './shared';

export const complianceCategoryEnum = pgEnum('compliance_category', [
  'tax', 'business_registration', 'employment', 'environment', 'health_safety', 'sector_specific'
]);

export const businessTypes = pgTable('business_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  countryId: uuid('country_id').references(() => countries.id),
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
  isActive: boolean('is_active').notNull().default(true),
  lastVerifiedAt: timestamp('last_verified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('compliance_country_idx').on(table.countryId),
  index('compliance_category_idx').on(table.category),
]);
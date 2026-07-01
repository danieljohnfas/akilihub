import { pgTable, text, timestamp, uuid, numeric, integer, index, pgEnum } from 'drizzle-orm/pg-core';
import { countries } from './shared';

export const healthIndicators = pgTable('health_indicators', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // WHO/DHIS2 indicator code
  name: text('name').notNull(),
  unit: text('unit'), // e.g. 'per 1,000 live births', '%'
  category: text('category'), // e.g. 'maternal', 'child', 'infectious'
  dhis2Id: text('dhis2_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const healthDataPoints = pgTable('health_data_points', {
  id: uuid('id').primaryKey().defaultRandom(),
  indicatorId: uuid('indicator_id').notNull().references(() => healthIndicators.id),
  countryId: uuid('country_id').notNull().references(() => countries.id),
  value: numeric('value', { precision: 12, scale: 4 }).notNull(),
  year: integer('year').notNull(),
  period: text('period'), // e.g. '2024Q1'
  source: text('source').default('DHIS2'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('health_indicator_country_idx').on(table.indicatorId, table.countryId),
  index('health_year_idx').on(table.year),
]);
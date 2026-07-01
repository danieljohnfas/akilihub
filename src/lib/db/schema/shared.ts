import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';

export const countries = pgTable('countries', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(), // ISO 3166-1 alpha-2: KE, TZ, UG, RW
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const regions = pgTable('regions', {
  id: uuid('id').primaryKey().defaultRandom(),
  countryId: uuid('country_id').notNull().references(() => countries.id),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const districts = pgTable('districts', {
  id: uuid('id').primaryKey().defaultRandom(),
  regionId: uuid('region_id').notNull().references(() => regions.id),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
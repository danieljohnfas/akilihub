import { pgTable, text, timestamp, uuid, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { countries } from './shared';

export const alertFrequencyEnum = pgEnum('alert_frequency', ['immediate', 'daily', 'weekly']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // matches Supabase Auth UID
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  countryId: uuid('country_id').references(() => countries.id),
  isPro: boolean('is_pro').notNull().default(false),
  proExpiresAt: timestamp('pro_expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const userAlerts = pgTable('user_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  module: text('module').notNull(), // 'tenders' | 'compliance' | 'health' | 'salaries'
  keywords: text('keywords').array(),
  countryId: uuid('country_id').references(() => countries.id),
  frequency: alertFrequencyEnum('frequency').notNull().default('daily'),
  isActive: boolean('is_active').notNull().default(true),
  lastSentAt: timestamp('last_sent_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
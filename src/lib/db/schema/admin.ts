import { pgTable, text, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';

export const adminConfig = pgTable('admin_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  // bcrypt hash of the admin password
  passwordHash: text('password_hash').notNull(),
  // TOTP secret (base32 encoded) — store encrypted in production
  totpSecret: text('totp_secret').notNull(),
  // Whether setup has been completed
  isSetup: boolean('is_setup').notNull().default(false),
  role: text('role').notNull().default('admin'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Tracks AI data cleanup and verification progress to avoid rescanning
 * the same records continuously across modules.
 */
export const dataVerificationLog = pgTable('data_verification_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  recordId: uuid('record_id').notNull(),
  sourceModule: text('source_module').notNull(), // 'jobs', 'tenders', 'compliance'
  targetModule: text('target_module').notNull(), // The AI's classification
  actionTaken: text('action_taken').notNull(), // 'none', 'moved', 'deleted'
  verifiedAt: timestamp('verified_at').notNull().defaultNow(),
});

export type AdminConfig = typeof adminConfig.$inferSelect;

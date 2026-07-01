import { pgTable, text, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';

export const adminConfig = pgTable('admin_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  // bcrypt hash of the admin password
  passwordHash: text('password_hash').notNull(),
  // TOTP secret (base32 encoded) — store encrypted in production
  totpSecret: text('totp_secret').notNull(),
  // Whether setup has been completed
  isSetup: boolean('is_setup').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type AdminConfig = typeof adminConfig.$inferSelect;

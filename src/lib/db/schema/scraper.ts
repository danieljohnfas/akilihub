import { pgTable, text, jsonb, integer, timestamp } from 'drizzle-orm/pg-core';

/**
 * Cache of declarative page parsers (CSS-selector specs) keyed by a structural
 * fingerprint of the page. Replaces the old committed `parsers/*.js` files:
 * data in the DB, not code in the repo.
 */
export const scraperParsers = pgTable('scraper_parsers', {
  hash: text('hash').primaryKey(),
  spec: jsonb('spec').notNull(),
  hitCount: integer('hit_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at').notNull().defaultNow(),
});

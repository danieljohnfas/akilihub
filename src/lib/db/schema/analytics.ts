import { pgTable, uuid, timestamp, text, varchar } from 'drizzle-orm/pg-core';

export const outboundClicks = pgTable('outbound_clicks', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'job', 'tender', 'compliance_resource'
  entityId: uuid('entity_id').notNull(),
  targetUrl: text('target_url').notNull(),
  clickedAt: timestamp('clicked_at').defaultNow().notNull(),
});

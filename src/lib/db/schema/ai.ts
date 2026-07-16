import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const aiTelemetry = pgTable('ai_telemetry', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  coolUntil: integer('cool_until').notNull().default(0),
  errorCount: integer('error_count').notNull().default(0),
  lastUsed: integer('last_used').notNull().default(0),
  totalCalls: integer('total_calls').notNull().default(0),
  totalErrors: integer('total_errors').notNull().default(0),
  supportsStructured: boolean('supports_structured').notNull().default(false),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

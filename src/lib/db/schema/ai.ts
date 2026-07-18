import { pgTable, text, timestamp, integer, boolean, bigint } from 'drizzle-orm/pg-core';

/**
 * Tracks AI model pool state across serverless invocations.
 * Used by key-pool.ts to persist cooldowns, error counts, and telemetry.
 */
export const aiTelemetry = pgTable('ai_telemetry', {
  id: text('id').primaryKey(),        // e.g. "groq-llama33-1"
  name: text('name').notNull(),       // Human-readable label
  supportsStructured: boolean('supports_structured').notNull().default(true),
  coolUntil: bigint('cool_until', { mode: 'number' }).notNull().default(0),     // Unix ms timestamp
  errorCount: integer('error_count').notNull().default(0),
  lastUsed: bigint('last_used', { mode: 'number' }).notNull().default(0),       // Unix ms timestamp
  totalCalls: integer('total_calls').notNull().default(0),
  totalErrors: integer('total_errors').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

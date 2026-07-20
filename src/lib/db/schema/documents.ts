import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const userDocuments = pgTable('user_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id').notNull(), // To link anonymous users
  filename: text('filename').notNull(),
  // Full extracted text
  content: text('content').notNull(),
  // AI-compressed version if the original is too long
  summary: text('summary'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

import { pgTable, text, timestamp, uuid, integer, pgEnum, index } from 'drizzle-orm/pg-core';
import { tenders } from './tenders';

export const attachmentTypeEnum = pgEnum('attachment_type', ['pdf', 'doc', 'xlsx', 'zip', 'other']);

/**
 * Tender Attachments
 *
 * Stores PDF/document links and their extracted plain-text content.
 * Created by the pdf-extract pipeline when a tender page contains
 * downloadable document links.
 *
 * The `extractedText` field holds plain text from PDF parsing (pdf-parse /
 * trafilatura) for AI extraction and full-text search.
 */
export const tenderAttachments = pgTable('tender_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenderId: uuid('tender_id').notNull().references(() => tenders.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull().unique(),
  fileType: attachmentTypeEnum('file_type').notNull().default('pdf'),
  fileSizeBytes: integer('file_size_bytes'),
  extractedText: text('extracted_text'),
  extractionStatus: text('extraction_status').notNull().default('pending'), // pending | done | failed
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('attachments_tender_idx').on(table.tenderId),
  index('attachments_status_idx').on(table.extractionStatus),
]);

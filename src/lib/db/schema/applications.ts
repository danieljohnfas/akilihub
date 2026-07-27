import { pgTable, text, timestamp, uuid, integer, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';
import { jobs } from './jobs';

export const applicationStatusEnum = pgEnum('application_status', ['pending', 'reviewed', 'accepted', 'rejected']);

export const jobApplications = pgTable('job_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  sessionId: text('session_id'), // For anonymous users
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  cvUrl: text('cv_url'), // Supabase Storage URL or path
  cvText: text('cv_text'), // Extracted raw text from CV
  score: integer('score'), // AI match score out of 100
  matchAnalysis: text('match_analysis'), // AI feedback on CV vs Job description
  coverLetter: text('cover_letter'), // Auto-generated tailored cover letter
  status: applicationStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const mockInterviews = pgTable('mock_interviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => jobApplications.id, { onDelete: 'cascade' }),
  transcript: jsonb('transcript').default('[]').notNull(), // Array of { role: 'user'|'assistant', content: string }
  finalScore: integer('final_score'), // Overall score from the interview
  feedback: text('feedback'), // Detailed feedback on the candidate's answers
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

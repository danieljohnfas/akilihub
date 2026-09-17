import { pgTable, text, uuid, numeric, timestamp } from 'drizzle-orm/pg-core';

export const professions = pgTable('professions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(), // e.g., "Software Engineer"
  
  // AI Risk Map metrics from BenchmarkList / GDPval
  automationRiskScore: numeric('automation_risk_score', { precision: 4, scale: 2 }), // 0.00 to 10.00
  resilienceRationale: text('resilience_rationale'),
  upskillingAdvice: text('upskilling_advice'),
  founderOpportunity: text('founder_opportunity'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

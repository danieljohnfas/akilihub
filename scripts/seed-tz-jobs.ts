/**
 * seed-tz-jobs.ts — Programmatic generator of ~4,000 Tanzania job postings.
 * Run with: npx tsx scripts/seed-tz-jobs.ts
 *
 * Standards:
 *  - is_aggregator_source: false (direct employer postings)
 *  - needs_ai_extraction: true (AI enriches sector/profession/skills later)
 *  - salary_currency: 'TZS'
 *  - ON CONFLICT (source_url) DO NOTHING  — fully idempotent
 *  - Batches of 100 for performance
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import postgres from 'postgres';
import crypto from 'crypto';

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 10 });

// -- Types ---------------------------------------------------------------------

type JobType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'remote';
type ExpLevel = 'entry' | 'mid' | 'senior' | 'executive';

interface Employer {
  name: string;
  domain: string;
  sector: string;
}

interface JobRecord {
  id: string;
  country_id: string;
  title: string;
  company_name: string;
  description: string;
  location: string;
  job_type: JobType;
  experience_level: ExpLevel;
  salary_min: number;
  salary_max: number;
  salary_currency: 'TZS';
  source_url: string;
  employer_url: string;
  is_aggregator_source: false;
  needs_ai_extraction: true;
  is_active: true;
  posted_date: string;
}

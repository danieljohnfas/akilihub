
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as sharedSchema from './schema/shared';
import * as tendersSchema from './schema/tenders';
import * as complianceSchema from './schema/compliance';
import * as healthSchema from './schema/health';
import * as salariesSchema from './schema/salaries';
import * as usersSchema from './schema/users';
import * as adminSchema from './schema/admin';
import * as jobsSchema from './schema/jobs';
import * as aiSchema from './schema/ai';
import * as guidesSchema from './schema/guides';
import * as documentsSchema from './schema/documents';
import * as analyticsSchema from './schema/analytics';
import * as applicationsSchema from './schema/applications';

const schema = {
  ...sharedSchema,
  ...tendersSchema,
  ...complianceSchema,
  ...healthSchema,
  ...salariesSchema,
  ...usersSchema,
  ...adminSchema,
  ...jobsSchema,
  ...aiSchema,
  ...guidesSchema,
  ...documentsSchema,
  ...analyticsSchema,
  ...applicationsSchema,
};

// Prevent multiple instances during development HMR
const globalForDb = globalThis as unknown as { conn: postgres.Sql };

// Provide a robust dummy fallback
let connectionString = (process.env.DATABASE_URL || process.env.DIRECT_URL) || 'postgres://dummy:dummy@localhost:5432/dummy';

if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
  console.warn('Invalid DATABASE_URL provided. Falling back to dummy for build phase.');
  connectionString = 'postgres://dummy:dummy@localhost:5432/dummy';
}

const isCloudDb = connectionString.includes('supabase.com') || connectionString.includes('neon.tech') || connectionString.includes('pooler.supabase.com');

const conn = globalForDb.conn ?? postgres(connectionString, {
  // Supabase pooler / cloud databases require SSL even in development
  ssl: process.env.NODE_ENV === 'production' || isCloudDb ? 'require' : false,
  max: 10,
  idle_timeout: 10,
  connect_timeout: 30,
  prepare: false, // pgBouncer does not support prepared statements
});

if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
export type DB = typeof db;

/**
 * safeQuery - wraps a db query promise in a try/catch and race-timeout.
 * Returns the result on success, or [] on failure/timeout.
 * This prevents a slow DB cold start or connection queue from triggering a Vercel 504 timeout.
 */
export async function safeQuery<T extends unknown[]>(query: Promise<T>, timeoutMs = 25000, label: string = 'Unnamed Query'): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Query [${label}] timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    // Wrap the query in an async IIFE to ensure `await query` is called with the correct `this` context.
    // Promise.race extracts .then() and loses `this` for Drizzle query builders.
    const p = (async () => await query)();
    const result = await Promise.race([p, timeoutPromise]);
    return result as T;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[DB Error] safeQuery caught in [${label}]:`, message, err instanceof Error ? err.stack : err);
    return [] as unknown as T;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

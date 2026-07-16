import { config } from 'dotenv';
config({ path: '.env.local' });
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
};

// Prevent multiple instances during development HMR
const globalForDb = globalThis as unknown as { conn: postgres.Sql };

// Provide a robust dummy fallback
let connectionString = process.env.DATABASE_URL || 'postgres://dummy:dummy@localhost:5432/dummy';

// Validate the URL. If the user accidentally left placeholders like [YOUR-PASSWORD] in the Vercel dashboard,
// new URL() will throw ERR_INVALID_URL. We catch it and use the dummy string so the build can proceed.
try {
  new URL(connectionString);
} catch (e) {
  console.warn('Invalid DATABASE_URL provided. Falling back to dummy for build phase.');
  connectionString = 'postgres://dummy:dummy@localhost:5432/dummy';
}

const conn = globalForDb.conn ?? postgres(connectionString, {
  // Supabase pooler requires SSL. Always enforce it regardless of NODE_ENV
  // to match Vercel's serverless environment.
  ssl: 'require',
  // Serverless functions must use max: 1 to avoid overwhelming PgBouncer
  max: 1,
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false, // pgBouncer does not support prepared statements
});

if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
export type DB = typeof db;

/**
 * safeQuery - wraps a db query promise in a try/catch.
 * Returns the result on success, or [] on failure.
 * This prevents a DB misconfiguration from crashing the entire page with a 500.
 */
export async function safeQuery<T extends unknown[]>(query: Promise<T>): Promise<T> {
  try {
    return await query;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[DB Error] safeQuery caught:', message);
    return [] as unknown as T;
  }
}
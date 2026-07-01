import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as sharedSchema from './schema/shared';
import * as tendersSchema from './schema/tenders';
import * as complianceSchema from './schema/compliance';
import * as healthSchema from './schema/health';
import * as salariesSchema from './schema/salaries';
import * as usersSchema from './schema/users';

const schema = {
  ...sharedSchema,
  ...tendersSchema,
  ...complianceSchema,
  ...healthSchema,
  ...salariesSchema,
  ...usersSchema,
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
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
export type DB = typeof db;
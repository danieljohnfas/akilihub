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

const conn = globalForDb.conn ?? postgres(process.env.DATABASE_URL!, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
export type DB = typeof db;
import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });

/** Adds sslmode=require only when the URL does not already set it (and keeps any existing query string). */
function withSsl(raw: string | undefined): string {
  if (!raw) return "";
  try {
    const u = new URL(raw);
    if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
    return u.toString();
  } catch {
    return raw;
  }
}

export default defineConfig({
  schema: './src/lib/db/schema/*',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: withSsl(process.env.DIRECT_URL || process.env.DATABASE_URL),
  },
});

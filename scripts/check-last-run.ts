import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { tenders } from '../src/lib/db/schema/tenders';
import { salarySubmissions } from '../src/lib/db/schema/salaries';
import { complianceRequirements } from '../src/lib/db/schema/compliance';
import { healthDataPoints } from '../src/lib/db/schema/health';
import { sql } from 'drizzle-orm';

async function main() {
  const [j, t, s, c, h] = await Promise.all([
    db.select({ latest: sql<string>`max(created_at)`, count: sql<number>`count(*)` }).from(jobs),
    db.select({ latest: sql<string>`max(created_at)`, count: sql<number>`count(*)` }).from(tenders),
    db.select({ latest: sql<string>`max(submitted_at)`, count: sql<number>`count(*)` }).from(salarySubmissions),
    db.select({ latest: sql<string>`max(created_at)`, count: sql<number>`count(*)` }).from(complianceRequirements),
    db.select({ latest: sql<string>`max(created_at)`, count: sql<number>`count(*)` }).from(healthDataPoints),
  ]);

  const fmt = (ts: string | null) =>
    ts ? new Date(ts).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : 'Never            ';

  const hoursAgo = (ts: string | null) => {
    if (!ts) return 'N/A';
    const h = ((Date.now() - new Date(ts).getTime()) / 3_600_000);
    return h < 24 ? `${h.toFixed(1)}h ago` : `${(h / 24).toFixed(1)}d ago`;
  };

  console.log('\nModule        | Last Insert             | Total   | Age');
  console.log('--------------|-------------------------|---------|----------');
  console.log(`Jobs          | ${fmt(j[0].latest)} | ${String(j[0].count).padEnd(7)} | ${hoursAgo(j[0].latest)}`);
  console.log(`Tenders       | ${fmt(t[0].latest)} | ${String(t[0].count).padEnd(7)} | ${hoursAgo(t[0].latest)}`);
  console.log(`Salaries      | ${fmt(s[0].latest)} | ${String(s[0].count).padEnd(7)} | ${hoursAgo(s[0].latest)}`);
  console.log(`Compliance    | ${fmt(c[0].latest)} | ${String(c[0].count).padEnd(7)} | ${hoursAgo(c[0].latest)}`);
  console.log(`Health Data   | ${fmt(h[0].latest)} | ${String(h[0].count).padEnd(7)} | ${hoursAgo(h[0].latest)}`);
  console.log(`\n  Current time: ${new Date().toISOString()} (EAT = UTC+3)`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

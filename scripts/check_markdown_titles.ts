import { db } from '../src/lib/db';
import { jobs } from '../src/lib/schema';
import { like, or } from 'drizzle-orm';
async function run() {
    const res = await db.query.jobs.findMany({ where: or(like(jobs.title, '[LINK]%'), like(jobs.title, '[IMAGE:%')), limit: 5 });
    console.log('Found', res.length, 'bad titles');
    console.log(res.map(r => ({ id: r.id, title: r.title, employer_url: r.employer_url })));
    process.exit(0);
}
run();

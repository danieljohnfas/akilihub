import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema/jobs";
import { tenders } from "@/lib/db/schema/tenders";
import { eq, and, isNull } from "drizzle-orm";
import { ResolveItem } from "./resolve-item";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminResolvePage() {
  // Fetch unresolved jobs
  const unresolvedJobs = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      company: jobs.companyName,
      sourceUrl: jobs.sourceUrl,
    })
    .from(jobs)
    .where(and(eq(jobs.isAggregatorSource, true), isNull(jobs.employerUrl)))
    .limit(100);

  // Fetch unresolved tenders
  const unresolvedTenders = await db
    .select({
      id: tenders.id,
      title: tenders.title,
      company: tenders.contractingAuthority,
      sourceUrl: tenders.sourceUrl,
    })
    .from(tenders)
    .where(and(eq(tenders.isAggregatorSource, true), isNull(tenders.employerUrl)))
    .limit(100);

  const totalCount = unresolvedJobs.length + unresolvedTenders.length;

  return (
    <div className="container max-w-5xl py-12 mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display tracking-tight text-ink mb-2">
          URL Resolution Queue
        </h1>
        <p className="text-muted-foreground text-lg">
          {totalCount === 0
            ? "Queue is empty. All aggregator sources have been resolved!"
            : `There are ${totalCount} items needing manual resolution to bypass aggregators.`}
        </p>
      </div>

      {unresolvedJobs.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-ink flex items-center">
            Jobs ({unresolvedJobs.length})
          </h2>
          <div className="space-y-1">
            {unresolvedJobs.map((job) => (
              <ResolveItem
                key={job.id}
                id={job.id}
                type="job"
                title={job.title}
                company={job.company!}
                sourceUrl={job.sourceUrl}
              />
            ))}
          </div>
        </section>
      )}

      {unresolvedTenders.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 text-ink flex items-center">
            Tenders ({unresolvedTenders.length})
          </h2>
          <div className="space-y-1">
            {unresolvedTenders.map((tender) => (
              <ResolveItem
                key={tender.id}
                id={tender.id}
                type="tender"
                title={tender.title}
                company={tender.company!}
                sourceUrl={tender.sourceUrl}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

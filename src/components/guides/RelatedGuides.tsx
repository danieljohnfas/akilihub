import { db, safeQuery } from '@/lib/db/client';
import { guides } from '@/lib/db/schema/guides';
import { eq, desc, and } from 'drizzle-orm';
import Link from 'next/link';

interface RelatedGuidesProps {
  category?: "procurement" | "health" | "compliance" | "jobs" | "salaries" | "general";
  limit?: number;
  title?: string;
  className?: string;
}

export async function RelatedGuides({ category, limit = 3, title = "Related Insights", className = "" }: RelatedGuidesProps) {
  const conditions = [eq(guides.isPublished, true)];
  if (category) {
    conditions.push(eq(guides.category, category));
  }

  const relatedGuides = await safeQuery(
    db.select()
      .from(guides)
      .where(and(...conditions))
      .orderBy(desc(guides.publishedAt))
      .limit(limit)
  );

  if (!relatedGuides || relatedGuides.length === 0) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold tracking-tight">{title}</h3>
        <Link href="/guides" className="text-sm text-primary hover:underline font-medium">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {relatedGuides.map((guide) => (
          <Link
            key={guide.id}
            href={`/guides/${guide.slug}`}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between gap-4 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {guide.category}
                </span>
                <span className="text-xs text-muted-foreground">
                  {guide.readingTimeMinutes} min read
                </span>
              </div>
              <h4 className="text-lg font-semibold leading-tight mb-2 group-hover:text-primary transition-colors">
                {guide.title}
              </h4>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {guide.summary}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

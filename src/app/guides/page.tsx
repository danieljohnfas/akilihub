import { db, safeQuery } from '@/lib/db/client';
import { guides } from '@/lib/db/schema/guides';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';

export const metadata = {
  title: 'Professional Guides & Insights | AkiliBrain',
  description: 'Deep dives, data analysis, and professional guides for East African markets.',
};

// Revalidate every hour
export const revalidate = 3600;

export default async function GuidesIndexPage() {
  const publishedGuides = await safeQuery(
    db.select().from(guides).where(eq(guides.isPublished, true)).orderBy(desc(guides.publishedAt))
  );

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl space-y-8">
      <header className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Intelligence & Guides</h1>
        <p className="text-xl text-muted-foreground">
          Original editorial content, data analysis, and professional guides for East African markets, updated weekly.
        </p>
      </header>

      {publishedGuides.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-muted-foreground">
          New guides are currently being generated. Check back soon.
        </div>
      ) : (
        <div className="grid gap-6">
          {publishedGuides.map((guide) => (
            <Link
              key={guide.id}
              href={`/guides/${guide.slug}`}
              className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors group"
            >
              <div className="flex justify-between items-start gap-4 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {guide.category}
                </span>
                <span className="text-sm text-muted-foreground">
                  {guide.publishedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <h2 className="text-2xl font-semibold mb-2 group-hover:text-primary transition-colors">
                {guide.title}
              </h2>
              <p className="text-muted-foreground line-clamp-2">
                {guide.summary}
              </p>
              <div className="mt-4 flex items-center text-sm text-muted-foreground gap-2">
                <span>{guide.readingTimeMinutes} min read</span>
                <span>·</span>
                <span>{guide.viewCount} views</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

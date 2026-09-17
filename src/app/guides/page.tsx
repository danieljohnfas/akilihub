import { db, safeQuery } from '@/lib/db/client';
import { guides } from '@/lib/db/schema/guides';
import { professions } from '@/lib/db/schema/professions';
import { eq, desc, asc } from 'drizzle-orm';
import Link from 'next/link';

import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbSchema } from '@/components/seo/schemas';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, BookOpen } from 'lucide-react';
import type { Metadata } from 'next';

// ... metadata unchanged ...
export const metadata: Metadata = {
  title: 'Professional Guides & Regional Insights',
  description:
    'Expert guides on regional procurement, career advancement, salary negotiation, and business compliance across East Africa and DRC.',
  keywords: [
    'East Africa business guides',
    'tender guides Kenya',
    'career advice East Africa',
    'salary negotiation guides Africa',
    'procurement strategies Africa',
  ],
  openGraph: {
    title: 'Professional Guides & Regional Insights | AkiliBrain',
    description:
      'Expert guides on regional procurement, career advancement, salary negotiation, and business compliance across East Africa and DRC.',
    url: 'https://akilibrain.com/guides',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Professional Guides & Regional Insights | AkiliBrain',
    description: 'Expert guides on procurement, careers, salaries, and compliance across East Africa.',
  },
  alternates: {
    canonical: 'https://akilibrain.com/guides',
  },
};

export const revalidate = 3600;

export default async function GuidesIndexPage() {
  const [publishedGuides, aiProfessions] = await Promise.all([
    safeQuery(db.select().from(guides).where(eq(guides.isPublished, true)).orderBy(desc(guides.publishedAt))),
    safeQuery(db.select().from(professions).orderBy(desc(professions.automationRiskScore)))
  ]);

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl space-y-12">
      <JsonLd
        schema={buildBreadcrumbSchema([
          { name: 'Home', url: 'https://akilibrain.com' },
          { name: 'Intelligence & Guides', url: 'https://akilibrain.com/guides' },
        ])}
      />
      <header className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Intelligence & Guides</h1>
        <p className="text-xl text-muted-foreground">
          Original editorial content, data analysis, and professional guides for East African markets, updated weekly.
        </p>
      </header>

      {/* AI Resilience Section */}
      {aiProfessions && aiProfessions.length > 0 && (
        <section className="bg-primary/5 rounded-2xl p-8 border border-primary/10">
          <div className="flex items-center gap-3 mb-6">
            <BrainCircuit className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold">AI Resilience & Upskilling Map</h2>
          </div>
          <p className="text-muted-foreground mb-8 max-w-3xl text-lg">
            Based on the latest economic benchmarks, some roles face rapid automation while others remain entirely human-driven. 
            Use this data to future-proof your career.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {aiProfessions.slice(0, 4).map((prof) => (
              <Card key={prof.id} className="bg-background/80 backdrop-blur border-white/10 hover:border-primary/30 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-xl">{prof.name}</CardTitle>
                    <Badge variant={Number(prof.automationRiskScore) > 6 ? "destructive" : "default"}>
                      Risk: {prof.automationRiskScore}/10
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">The Reality</h4>
                    <p className="text-sm">{prof.resilienceRationale}</p>
                  </div>
                  <div className="bg-primary/10 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-primary mb-1 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> Upskilling Path
                    </h4>
                    <p className="text-sm text-foreground/90">{prof.upskillingAdvice}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Standard Guides Section */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Latest Articles</h2>
        {publishedGuides.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-muted-foreground">
            New guides are currently being generated. Check back soon.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
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
                  <span>•</span>
                  <span>{guide.viewCount} views</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { db, safeQuery } from '@/lib/db/client';
import { tenders, tenderSectors } from '@/lib/db/schema/tenders';
import { countries } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and, sql } from 'drizzle-orm';
import { TenderCard } from '@/components/tenders/TenderCard';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Search, SlidersHorizontal, Inbox } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildItemListSchema, buildBreadcrumbSchema } from '@/components/seo/schemas';

export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Government Tenders in East Africa',
  description:
    'Browse the latest government tenders, procurement opportunities, and contracts across Kenya, Tanzania, Uganda, Rwanda, and wider Africa. Updated hourly.',
  keywords: [
    'government tenders Kenya',
    'tenders East Africa',
    'procurement Africa',
    'Kenya government contracts',
    'Tanzania tenders',
    'Uganda procurement',
    'Rwanda tenders',
    'open tenders Africa',
    'PPRA tenders',
    'PPB tenders',
  ],
  openGraph: {
    title: 'Government Tenders in East Africa',
    description:
      'Browse the latest government tenders and procurement opportunities across East Africa — Kenya, Tanzania, Uganda, and Rwanda.',
    url: 'https://akilibrain.com/tenders',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Government Tenders in East Africa',
    description: 'Browse the latest government tenders and procurement opportunities across East Africa.',
  },
  alternates: {
    canonical: 'https://akilibrain.com/tenders',
  },
};

export default async function TendersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sector?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q || '';
  const status = params.status || 'open';
  
  const conditions = [
    q ? ilike(tenders.title, `%${q}%`) : undefined,
    status ? eq(tenders.status, status as never) : undefined,
  ].filter(Boolean);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await safeQuery(db
    .select({
      tender: tenders,
      country: countries.name,
      sector: tenderSectors.name,
    })
    .from(tenders)
    .leftJoin(countries, eq(tenders.countryId, countries.id))
    .leftJoin(tenderSectors, eq(tenders.sectorId, tenderSectors.id))
    .where(whereClause)
    .orderBy(desc(tenders.publishedAt))
    .limit(20));

  const itemListSchema = buildItemListSchema(
    'Government Tenders in East Africa',
    'Latest government tenders and procurement opportunities across Kenya, Tanzania, Uganda, and Rwanda.',
    data.slice(0, 20).map(({ tender, country }, idx) => ({
      position: idx + 1,
      name: tender.title,
      description: `By ${tender.contractingAuthority}${country ? ` — ${country}` : ''}. Deadline: ${tender.deadline.toDateString()}.`,
      url: `https://akilibrain.com/tenders/${tender.id}`,
    }))
  );

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: 'https://akilibrain.com' },
    { name: 'Procurement Directory', url: 'https://akilibrain.com/tenders' },
  ]);

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8">
      {data.length > 0 && <JsonLd schema={itemListSchema} />}
      <JsonLd schema={breadcrumbSchema} />
      {/* Header & Search */}
      <div className="flex flex-col items-center text-center gap-6 border-b border-white/5 pb-10 mb-6">
        <div className="space-y-4 flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Procurement Directory</h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Discover and track government tenders and contracts from across the continent.
          </p>
        </div>
        
        <form className="w-full max-w-md flex items-center gap-2" action="/tenders" method="GET">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              name="q"
              placeholder="Search tenders..." 
              className="pl-9 bg-white/5 border-white/10 focus-visible:ring-primary/50"
              defaultValue={q}
            />
            {status && <input type="hidden" name="status" value={status} />}
          </div>
          <Button variant="outline" size="icon" type="button" className="shrink-0 bg-white/5 border-white/10">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'open', 'closed', 'awarded', 'cancelled'].map((s) => (
          <Link key={s} href={`/tenders?${new URLSearchParams({ ...(q ? { q } : {}), ...(s !== 'all' ? { status: s } : {}) }).toString()}`}>
            <Button
              variant={status === s || (s === 'all' && !status) ? 'default' : 'secondary'}
              size="sm"
              className="rounded-full"
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          </Link>
        ))}
      </div>

      {/* Grid */}
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-white/10 rounded-xl bg-white/5 border-dashed">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No tenders found</h3>
          <p className="text-muted-foreground max-w-md">
            We couldn&apos;t find any tenders matching your current search criteria. Try adjusting your filters or search term.
          </p>
          {(q || status !== 'open') && (
            <Link href="/tenders" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
              Clear all filters
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map(({ tender, country, sector }) => (
            <TenderCard
              key={tender.id}
              id={tender.id}
              title={tender.title}
              referenceNo={tender.referenceNo}
              contractingAuthority={tender.contractingAuthority}
              country={country || 'Unknown'}
              sector={sector || undefined}
              status={tender.status}
              deadline={tender.deadline}
              budget={tender.budget}
              currency={tender.currency}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { db, safeQuery } from '@/lib/db/client';
import { tenders, tenderSectors } from '@/lib/db/schema/tenders';
import { countries, regions } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and, count } from 'drizzle-orm';
import { TenderCard } from '@/components/tenders/TenderCard';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Search, SlidersHorizontal, ArrowRight, Calendar, Building, FileText, Globe, Inbox } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildItemListSchema, buildBreadcrumbSchema } from '@/components/seo/schemas';
import { parseGlobalSearchParams } from '@/lib/filters';
import { RelatedGuides } from '@/components/guides/RelatedGuides';
import { GlobalFilterBar, FilterConfig } from '@/components/shared/GlobalFilterBar';

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

const PAGE_SIZE = 20;

export default async function TendersPage({
  searchParams: rawParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { q, status = 'open', country, page } = parseGlobalSearchParams(await rawParams);
  const offset = (page - 1) * PAGE_SIZE;
  
  const conditions = [
    q ? ilike(tenders.title, `%${q}%`) : undefined,
    status ? eq(tenders.status, status as never) : undefined,
    country ? eq(countries.name, country) : undefined,
  ].filter(Boolean);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const totalCountResult = await safeQuery(
    db.select({ value: count() }).from(tenders).leftJoin(countries, eq(tenders.countryId, countries.id)).where(whereClause)
  );
  const totalCount = totalCountResult?.[0]?.value || 0;

  const data = await safeQuery(db
    .select({
      tender: tenders,
      country: countries.name,
      sector: tenderSectors.name,
      region: regions.name,
    })
    .from(tenders)
    .leftJoin(countries, eq(tenders.countryId, countries.id))
    .leftJoin(tenderSectors, eq(tenders.sectorId, tenderSectors.id))
    .leftJoin(regions, eq(tenders.regionId, regions.id))
    .where(whereClause)
    .orderBy(desc(tenders.publishedAt))
    .limit(PAGE_SIZE)
    .offset(offset));

  // Fetch unique countries for the filter dropdown
  const uniqueCountriesData = await safeQuery(
    db.selectDistinct({ name: countries.name })
      .from(tenders)
      .innerJoin(countries, eq(tenders.countryId, countries.id))
  );
  const uniqueCountriesList = uniqueCountriesData.map(c => c.name).filter((c): c is string => Boolean(c)).sort();


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

  const tenderFilters: FilterConfig[] = [
    {
      id: 'q',
      type: 'search',
      label: 'Search Keywords',
      placeholder: 'Search tenders...',
    },
    {
      id: 'country',
      type: 'select',
      label: 'Country',
      options: [
        { value: 'all', label: 'All Countries' },
        ...uniqueCountriesList.map(c => ({ value: c, label: c }))
      ]
    },
    {
      id: 'status',
      type: 'pills',
      options: [
        { value: 'all', label: 'All' },
        { value: 'open', label: 'Open' },
        { value: 'closed', label: 'Closed' },
        { value: 'awarded', label: 'Awarded' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      defaultValue: 'open'
    }
  ];

  const hasFilters = q || status !== 'open' || country;

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
          {totalCount > 0 && (
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-white/70 mt-2">
              Showing <span className="text-white mx-1">{data.length}</span> of <span className="text-white mx-1">{totalCount}</span> results
            </div>
          )}
        </div>
      </div>

      <GlobalFilterBar filters={tenderFilters}>
        <Button variant="outline" size="icon" type="button" className="shrink-0 bg-white/5 border-white/10 hidden md:flex">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
        <Link 
          href="/tenders/calendar"
          className={buttonVariants({ variant: "outline", className: "shrink-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300" })}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Deadline Calendar
        </Link>
      </GlobalFilterBar>

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
          {hasFilters && (
            <Link href="/tenders" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
              Clear all filters
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map(({ tender, country, sector, region }) => (
            <TenderCard
              key={tender.id}
              id={tender.id}
              title={tender.title}
              referenceNo={tender.referenceNo}
              contractingAuthority={tender.contractingAuthority}
              country={country || 'Unknown'}
              region={region || undefined}
              sector={sector || undefined}
              status={tender.status}
              deadline={tender.deadline}
              budget={tender.budget}
              currency={tender.currency}
              documentUrl={tender.documentUrl}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data.length > 0 && (
        <div className="flex items-center justify-center gap-4 pt-6 border-t border-white/5">
          {page > 1 && (
            <Link
              href={`/tenders?q=${q}&status=${status}&country=${country || ''}&page=${page - 1}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground">Page {page}</span>
          {data.length === PAGE_SIZE && (
            <Link
              href={`/tenders?q=${q}&status=${status}&country=${country || ''}&page=${page + 1}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Next →
            </Link>
          )}
        </div>
      )}

      {/* Related Guides Interweave */}
      <div className="pt-10 mt-8">
        <RelatedGuides category="procurement" title="Procurement Insights & Guides" />
      </div>

      {/* SEO: Internal linking */}
      <div className="border-t border-white/5 pt-10 mt-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-6">Browse Procurement Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { label: 'Open Tenders', href: '/tenders?status=open' },
            { label: 'Awarded Contracts', href: '/tenders?status=awarded' },
            { label: 'Closed Tenders', href: '/tenders?status=closed' },
            { label: 'Tenders in Kenya', href: '/tenders?q=kenya' },
            { label: 'Tenders in Tanzania', href: '/tenders?q=tanzania' },
            { label: 'Tenders in Uganda', href: '/tenders?q=uganda' },
            { label: 'Construction Tenders', href: '/tenders?q=construction' },
            { label: 'ICT & Technology Tenders', href: '/tenders?q=ict' },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

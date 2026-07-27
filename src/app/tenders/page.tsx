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
import { AdSlot } from '@/components/shared/AdSlot';
import { PremiumBanner } from '@/components/shared/PremiumBanner';
import React from 'react';

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

import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';

const getUniqueCountries = unstable_cache(async () => {
  const uniqueCountriesData = await safeQuery(
    db.selectDistinct({ name: countries.name })
      .from(tenders)
      .innerJoin(countries, eq(tenders.countryId, countries.id))
  );
  return uniqueCountriesData.map(c => c.name).filter((c): c is string => Boolean(c)).sort();
}, ['tenders-unique-countries'], { revalidate: 3600 });

export default async function TendersPage({
  searchParams: rawParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = parseGlobalSearchParams(await rawParams);
  const uniqueCountriesList = await getUniqueCountries();

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

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col items-center text-center gap-6 border-b border-white/5 pb-10 mb-6">
        <div className="space-y-4 flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Procurement Directory</h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Discover and track government tenders and contracts from across the continent.
          </p>
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
      <Suspense fallback={
        <div className="py-24 px-4 text-center">
          <h3 className="text-xl font-semibold mb-2 animate-pulse text-muted-foreground">Loading tenders...</h3>
        </div>
      }>
        <TendersList params={params} />
      </Suspense>

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

async function TendersList({ params }: { params: ReturnType<typeof parseGlobalSearchParams> }) {
  const { q, status = 'open', country, page } = params;
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

  const hasFilters = q || status !== 'open' || country;

  return (
    <>
      {data.length > 0 && <JsonLd schema={itemListSchema} />}
      <JsonLd schema={breadcrumbSchema} />
      
      {totalCount > 0 && (
        <div className="flex justify-center -mt-4 mb-8">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-white/70">
            Showing <span className="text-white mx-1">{data.length}</span> of <span className="text-white mx-1">{totalCount}</span> results
          </div>
        </div>
      )}

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
          {data.map(({ tender, country, sector, region }, idx) => (
            <React.Fragment key={tender.id}>
              <div className="col-span-1">
                <TenderCard
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
              </div>
              {idx === 2 && (
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                  <PremiumBanner />
                </div>
              )}
              {idx === 8 && (
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                  <AdSlot slotId="tenders-feed-1" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data.length > 0 && (
        <div className="flex items-center justify-center gap-4 pt-6 border-t border-white/5 mt-8">
          {page > 1 && (
            <Link
              href={`/tenders?q=${q || ''}&status=${status || ''}&country=${country || ''}&page=${page - 1}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground">Page {page}</span>
          {data.length === PAGE_SIZE && (
            <Link
              href={`/tenders?q=${q || ''}&status=${status || ''}&country=${country || ''}&page=${page + 1}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Next →
            </Link>
          )}
        </div>
      )}

      {/* SEO-rich Content Block for AdSense / Googlebot */}
      <section className="mt-16 space-y-8 text-muted-foreground border-t border-white/5 pt-12">
        <div className="border border-white/10 rounded-xl p-6 bg-white/5">
          <h2 className="text-2xl font-bold text-foreground mb-4">Navigating Government Procurement in East Africa</h2>
          <p className="leading-relaxed mb-4">
            Government tenders and public procurement contracts represent a significant opportunity for businesses of all sizes across East Africa. Governments in Kenya, Tanzania, Uganda, and Rwanda are the largest single purchasers of goods, services, and works. By participating in the procurement process, companies can secure substantial contracts, expand their operations, and contribute to national development.
          </p>
          <p className="leading-relaxed">
            AkiliBrain simplifies the tender discovery process by aggregating notices from various national procurement portals, including PPRA, PPOA, and PPDA, into a single, easily searchable directory. We aim to promote transparency and give businesses equal access to lucrative public sector opportunities.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-white/10 rounded-xl p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-3">Key Requirements for Bidding</h2>
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li><strong>Business Registration:</strong> Your company must be legally registered with the relevant national authority (e.g., BRS in Kenya, BRELA in Tanzania).</li>
              <li><strong>Tax Compliance:</strong> A valid Tax Compliance Certificate (TCC) from the national revenue authority (KRA, TRA, URA, RRA) is mandatory for almost all government tenders.</li>
              <li><strong>Special Categories (AGPO):</strong> Many countries have specific quotas for youth, women, and persons with disabilities. Ensure you have the relevant Access to Government Procurement Opportunities (AGPO) certificates if applicable.</li>
              <li><strong>Financial Capacity:</strong> Prepare audited financial statements and bank references to prove your company&apos;s ability to execute the contract.</li>
            </ul>
          </div>
          <div className="border border-white/10 rounded-xl p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-3">How to Succeed in Public Procurement</h2>
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li><strong>Read the Document Carefully:</strong> Tenders are won and lost on compliance. Ensure you meet every single mandatory requirement listed in the tender document.</li>
              <li><strong>Attend Pre-Bid Meetings:</strong> If a pre-bid meeting or site visit is scheduled, make sure a representative attends. It is often a mandatory requirement.</li>
              <li><strong>Submit on Time:</strong> Government procurement systems are strict. A bid submitted even one minute late will be rejected outright.</li>
              <li><strong>Price Competitively:</strong> While quality is important, price remains a major deciding factor in public tenders. Ensure your pricing is competitive but sustainable.</li>
            </ul>
          </div>
        </div>
        
        <div className="border border-white/10 rounded-xl p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-3">Frequently Asked Questions (FAQ)</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">Where do you source the tenders from?</h3>
                <p className="text-sm mt-1">We aggregate data directly from official government procurement portals, major daily newspapers, and public institution websites to provide a comprehensive database.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Is it free to view tender documents?</h3>
                <p className="text-sm mt-1">Yes, all basic tender details and links to the original source documents (where available electronically) are provided free of charge on our platform.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">How can I track specific tenders?</h3>
                <p className="text-sm mt-1">You can use our advanced filtering options to narrow down by country, sector, and status. Check back frequently as new opportunities are added daily.</p>
              </div>
            </div>
        </div>
      </section>
    </>
  );
}

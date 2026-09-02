import { db, safeQuery } from '@/lib/db/client';
import { businesses, businessTypes } from '@/lib/db/schema/compliance';
import { countries } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and, count } from 'drizzle-orm';
import { BusinessCard } from '@/components/compliance/BusinessCard';
import { Button, buttonVariants } from '@/components/ui/button';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbSchema } from '@/components/seo/schemas';
import { parseGlobalSearchParams } from '@/lib/filters';
import { AdSlot } from '@/components/shared/AdSlot';
import { PremiumBanner } from '@/components/shared/PremiumBanner';
import { DataLoadingState } from '@/components/shared/DataLoadingState';
import React, { Suspense } from 'react';
import { GlobalFilterBar, FilterConfig } from '@/components/shared/GlobalFilterBar';
import { RelatedGuides } from '@/components/guides/RelatedGuides';
import { Inbox, Building2, BookOpen, MapPin, FileText } from 'lucide-react';
import Link from 'next/link';
import { complianceRequirements } from '@/lib/db/schema/compliance';
import { ResourceCard } from '@/components/compliance/ResourceCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Business Registry & Compliance',
  description:
    'Search registered companies, verify compliance status, and find licensing requirements across Kenya, Tanzania, Uganda, Rwanda, Ethiopia, and DRC.',
  keywords: [
    'business registry Kenya',
    'company search East Africa',
    'business compliance Kenya',
    'KRA compliance',
    'company registration Africa',
    'business license Kenya',
    'CAK registration',
    'BRELA Tanzania',
    'URSB Uganda',
    'RDB Rwanda',
    'DGI DRC',
  ],
  openGraph: {
    title: 'Business Registry & Compliance',
    description:
      'Search registered companies, verify compliance status, and find licensing requirements across Kenya, Tanzania, Uganda, Rwanda, Ethiopia, and DRC.',
    url: 'https://akilibrain.com/compliance',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Business Registry & Compliance | AkiliBrain',
    description: 'Search registered companies and verify compliance across East Africa.',
  },
  alternates: {
    canonical: 'https://akilibrain.com/compliance',
  },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { unstable_cache } from 'next/cache';

const getUniqueCountries = unstable_cache(async () => {
  const uniqueCountriesData = await safeQuery(
    db.select({ name: countries.name })
      .from(countries)
  );
  return uniqueCountriesData.map(c => c.name).filter((c): c is string => Boolean(c)).sort();
}, ['compliance-all-countries'], { revalidate: 3600 });

export default async function CompliancePage({
  searchParams: rawParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = parseGlobalSearchParams(await rawParams);

  const uniqueCountriesList = await getUniqueCountries();

  const complianceFilters: FilterConfig[] = [
    {
      id: 'q',
      type: 'search',
      label: 'Search Registry',
      placeholder: 'Search companies & resources...',
    },
    {
      id: 'country',
      type: 'select',
      label: 'Location',
      icon: <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />,
      options: [
        { value: 'all', label: 'All Locations' },
        ...uniqueCountriesList.map(c => ({ value: c, label: c }))
      ],
      defaultValue: 'all'
    },
    {
      id: 'type',
      type: 'select',
      label: 'Resource Type',
      icon: <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />,
      options: [
        { value: 'all', label: 'All Types' },
        { value: 'form', label: 'Forms' },
        { value: 'calculator', label: 'Calculators' },
        { value: 'guideline', label: 'Guidelines' },
        { value: 'notice', label: 'Notices' },
      ],
      defaultValue: 'all'
    },
    {
      id: 'status',
      type: 'pills',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'suspended', label: 'Suspended' },
      ],
      defaultValue: 'all'
    }
  ];

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8">
      <JsonLd
        schema={buildBreadcrumbSchema([
          { name: 'Home', url: 'https://akilibrain.com' },
          { name: 'Business Registry', url: 'https://akilibrain.com/compliance' },
        ])}
      />
      {/* Header & Search */}
      <div className="flex flex-col items-center text-center gap-6 border-b border-white/5 pb-10 mb-6">
        <div className="space-y-4 flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Business Registry</h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Search registered companies and verify compliance status across African jurisdictions.
          </p>
        </div>
      </div>

      <GlobalFilterBar filters={complianceFilters} />

      <Tabs defaultValue="resources" className="w-full">
        <TabsList className="mb-6 bg-white/5 border border-white/10">
          <TabsTrigger value="resources" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BookOpen className="w-4 h-4" />
            Compliance Resources
          </TabsTrigger>
          <TabsTrigger value="businesses" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="w-4 h-4" />
            Business Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="space-y-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {(['all', 'form', 'calculator', 'guideline', 'notice'] as const).map((t) => {
              const isActive = (params.type || 'all') === t;
              const sp = new URLSearchParams();
              if (params.q) sp.set('q', params.q);
              if (t !== 'all') sp.set('type', t);
              if (params.country && params.country !== 'all') sp.set('country', params.country);
              return (
                <Link key={t} href={`/compliance${sp.toString() ? `?${sp.toString()}` : ''}`}>
                  <Button
                    variant={isActive ? 'default' : 'secondary'}
                    size="sm"
                    className="rounded-full capitalize"
                  >
                    {t}
                  </Button>
                </Link>
              );
            })}
          </div>
          <Suspense fallback={
            <DataLoadingState 
              title="Loading Compliance Resources..." 
              subtitle="Fetching regulatory guidelines, tax calculators, and business registration requirements." 
            />
          }>
            <ResourcesList params={params} />
          </Suspense>
        </TabsContent>

        <TabsContent value="businesses" className="space-y-6">
          <Suspense fallback={
            <DataLoadingState 
              title="Searching Registered Entities..." 
              subtitle="Scanning official enterprise registries across East Africa." 
            />
          }>
            <BusinessesList params={params} />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Related Guides Interweave */}
      <div className="pt-10 mt-8 border-t border-white/5">
        <RelatedGuides category="compliance" title="Compliance & Registration Guides" />
      </div>
    </div>
  );
}

async function ResourcesList({ params }: { params: ReturnType<typeof parseGlobalSearchParams> }) {
  const { q, country, type, page } = params;
  const PAGE_SIZE = 30;
  const offset = (page - 1) * PAGE_SIZE;

  // Build WHERE conditions — all filters are optional
  const conditions = [
    q       ? ilike(complianceRequirements.title, `%${q}%`)           : undefined,
    type && type !== 'all' ? eq(complianceRequirements.resourceType, type as any) : undefined,
  ].filter(Boolean) as any[];

  // Country filter: join countries table and match by name
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Build the base query with optional country join filter
  const baseQuery = db
    .select({
      resource: complianceRequirements,
      country: countries.name,
    })
    .from(complianceRequirements)
    .leftJoin(countries, eq(complianceRequirements.countryId, countries.id));

  // Apply country filter at join level if needed
  const countQuery = db
    .select({ value: count() })
    .from(complianceRequirements)
    .leftJoin(countries, eq(complianceRequirements.countryId, countries.id))
    .where(
      and(
        whereClause,
        country && country !== 'all' ? ilike(countries.name, `%${country}%`) : undefined,
        eq(complianceRequirements.isActive, true),
      )
    );

  const [totalCountResult, resources] = await Promise.all([
    safeQuery(countQuery),
    safeQuery(
      baseQuery
        .where(
          and(
            whereClause,
            country && country !== 'all' ? ilike(countries.name, `%${country}%`) : undefined,
            eq(complianceRequirements.isActive, true),
          )
        )
        .orderBy(desc(complianceRequirements.createdAt))
        .limit(PAGE_SIZE)
        .offset(offset)
    ),
  ]);

  const totalCount = totalCountResult?.[0]?.value ?? 0;

  if (resources.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-white/10 rounded-xl bg-white/5 border-dashed">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No compliance resources found</h3>
          <p className="text-muted-foreground max-w-md">
            No compliance guidelines or statutory requirements matched your current filter criteria. Try adjusting your search query or selecting a different country.
          </p>
          {(q || (type && type !== 'all') || (country && country !== 'all')) && (
            <Link href="/compliance" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
              Clear all filters
            </Link>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {totalCount > 0 && (
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-white/70">
            Showing <span className="text-white mx-1">{resources.length}</span> of <span className="text-white mx-1">{totalCount}</span> resources
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map(({ resource, country: countryName }, idx) => (
          <React.Fragment key={resource.id}>
            <ResourceCard
              id={resource.id}
              title={resource.title}
              description={resource.description}
              resourceType={resource.resourceType as any}
              issuingAuthority={resource.issuingAuthority}
              sourceUrl={resource.employerUrl ?? resource.sourceUrl}
              country={countryName || 'Unknown'}
              lastVerifiedAt={resource.lastVerifiedAt}
            />
            {idx === 2 && (
              <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <PremiumBanner />
              </div>
            )}
            {idx === 8 && (
              <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <AdSlot slotId="compliance-resources-1" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Pagination */}
      {resources.length > 0 && (() => {
        const getPageUrl = (newPage: number) => {
          const sp = new URLSearchParams();
          if (q) sp.set('q', q);
          if (type && type !== 'all') sp.set('type', type);
          if (country && country !== 'all') sp.set('country', country);
          if (newPage > 1) sp.set('page', newPage.toString());
          const qs = sp.toString();
          return `/compliance${qs ? `?${qs}` : ''}`;
        };
        return (
          <div className="flex items-center justify-center gap-4 pt-6 border-t border-white/5 mt-8">
            {page > 1 && (
              <Link
                href={getPageUrl(page - 1)}
                className={buttonVariants({ variant: 'outline' })}
              >
                ← Previous
              </Link>
            )}
            <span className="text-sm text-muted-foreground">Page {page}</span>
            {resources.length === PAGE_SIZE && (
              <Link
                href={getPageUrl(page + 1)}
                className={buttonVariants({ variant: 'outline' })}
              >
                Next →
              </Link>
            )}
          </div>
        );
      })()}
      
      {/* SEO-rich static content for Googlebot */}
      <section className="mt-16 space-y-8 text-muted-foreground border-t border-white/5 pt-12">
        <div className="border border-white/10 rounded-xl p-6 bg-white/5">
          <h2 className="text-2xl font-bold text-foreground mb-4">East Africa Business Compliance Guidelines</h2>
          <p className="leading-relaxed">
            Navigating regulatory compliance and business registration in East Africa can be complex. Our compliance resource hub consolidates official forms, tax calculators, guidelines, and regulatory notices from key government bodies across Kenya, Tanzania, Uganda, Rwanda, Ethiopia, and DRC into a single, searchable directory.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-white/10 rounded-xl p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-3">Supported Authorities</h2>
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li><strong>Kenya:</strong> KRA (Kenya Revenue Authority), BRS (Business Registration Service), NSSF, NHIF</li>
              <li><strong>Tanzania:</strong> TRA (Tanzania Revenue Authority), BRELA (Business Registrations and Licensing Agency)</li>
              <li><strong>Uganda:</strong> URA (Uganda Revenue Authority), URSB (Uganda Registration Services Bureau)</li>
              <li><strong>Rwanda:</strong> RDB (Rwanda Development Board), RRA (Rwanda Revenue Authority)</li>
            </ul>
          </div>
          <div className="border border-white/10 rounded-xl p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-3">Available Resource Types</h2>
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li><strong>Forms:</strong> Official PDF forms for tax returns, company registration, and annual returns.</li>
              <li><strong>Calculators:</strong> PAYE, VAT, and corporate tax estimation tools.</li>
              <li><strong>Guidelines:</strong> Step-by-step PDF manuals on regulatory compliance.</li>
              <li><strong>Notices:</strong> Recent gazette notices and regulatory updates from government agencies.</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

async function BusinessesList({ params }: { params: ReturnType<typeof parseGlobalSearchParams> }) {
  const { q, status = 'active', country, type, page } = params;
  const PAGE_SIZE = 30;
  const offset = (page - 1) * PAGE_SIZE;
  
  const conditions = [
    q ? ilike(businesses.name, `%${q}%`) : undefined,
    status && status !== 'all' ? eq(businesses.status, status) : undefined,
    country && country !== 'all' ? ilike(countries.name, `%${country}%`) : undefined,
    type && type !== 'all' ? ilike(businessTypes.name, `%${type}%`) : undefined,
  ].filter(Boolean);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const totalCountResult = await safeQuery(
    db.select({ value: count() })
      .from(businesses)
      .leftJoin(countries, eq(businesses.countryId, countries.id))
      .leftJoin(businessTypes, eq(businesses.typeId, businessTypes.id))
      .where(whereClause)
  );
  const totalCount = totalCountResult?.[0]?.value || 0;

  const data = await safeQuery(db
    .select({
      business: businesses,
      country: countries.name,
      type: businessTypes.name,
    })
    .from(businesses)
    .leftJoin(countries, eq(businesses.countryId, countries.id))
    .leftJoin(businessTypes, eq(businesses.typeId, businessTypes.id))
    .where(whereClause)
    .orderBy(desc(businesses.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset));

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'active', 'inactive', 'deregistered'].map((s) => (
          <Link key={s} href={`/compliance?${new URLSearchParams({ 
            ...(q ? { q } : {}), 
            ...(s !== 'all' ? { status: s } : {}),
            ...(country && country !== 'all' ? { country } : {}),
            ...(type && type !== 'all' ? { type } : {})
          }).toString()}`}>
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

      {totalCount > 0 && (
        <div className="flex justify-center mt-4 mb-6">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-white/70">
            Showing <span className="text-white mx-1">{data.length}</span> of <span className="text-white mx-1">{totalCount}</span> businesses
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <>
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-white/10 rounded-xl bg-white/5 border-dashed">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No registered businesses found</h3>
            <p className="text-muted-foreground max-w-md">
              No registered corporate entities matched your search parameters. Try broadening your keywords or clearing the jurisdiction filter.
            </p>
            {(q || (status && status !== 'all') || (country && country !== 'all') || (type && type !== 'all')) && (
              <Link href="/compliance" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
                Clear all filters
              </Link>
            )}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map(({ business, country, type }, idx) => (
            <React.Fragment key={business.id}>
              <BusinessCard
                id={business.id}
                name={business.name}
                registrationNumber={business.registrationNumber}
                country={country || 'Unknown'}
                type={type || undefined}
                status={business.status}
                registrationDate={business.registrationDate}
                directorsCount={business.directors?.length || 0}
              />
              {idx === 2 && (
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                  <PremiumBanner />
                </div>
              )}
              {idx === 8 && (
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                  <AdSlot slotId="compliance-businesses-1" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data.length > 0 && (() => {
        const getPageUrl = (newPage: number) => {
          const sp = new URLSearchParams();
          if (q) sp.set('q', q);
          if (status && status !== 'all') sp.set('status', status);
          if (country && country !== 'all') sp.set('country', country);
          if (type && type !== 'all') sp.set('type', type);
          if (newPage > 1) sp.set('page', newPage.toString());
          const qs = sp.toString();
          return `/compliance${qs ? `?${qs}` : ''}`;
        };
        return (
          <div className="flex items-center justify-center gap-4 pt-6 border-t border-white/5 mt-8">
            {page > 1 && (
              <Link
                href={getPageUrl(page - 1)}
                className={buttonVariants({ variant: 'outline' })}
              >
                ← Previous
              </Link>
            )}
            <span className="text-sm text-muted-foreground">Page {page}</span>
            {data.length === PAGE_SIZE && (
              <Link
                href={getPageUrl(page + 1)}
                className={buttonVariants({ variant: 'outline' })}
              >
                Next →
              </Link>
            )}
          </div>
        );
      })()}

      {/* SEO-rich static content for Googlebot */}
      <section className="mt-16 space-y-8 text-muted-foreground border-t border-white/5 pt-12">
        <div className="border border-white/10 rounded-xl p-6 bg-white/5">
          <h2 className="text-2xl font-bold text-foreground mb-4">Verify Company Registration Status in East Africa</h2>
          <p className="leading-relaxed">
            Due diligence is a critical step before entering into any business agreement, partnership, or employment contract. The AkiliBrain Business Search tool allows you to instantly verify the registration status, legal entity type, and directorship of companies registered in Kenya, Tanzania, Uganda, Rwanda, Ethiopia, and DRC by querying data directly from official national registries.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-white/10 rounded-xl p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-3">Why Verify Business Registration?</h2>
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li><strong>Prevent Fraud:</strong> Ensure you are dealing with a legally recognized corporate entity.</li>
              <li><strong>Procurement Compliance:</strong> Verify the legitimacy of vendors and suppliers before awarding contracts.</li>
              <li><strong>Employment Safety:</strong> Job seekers can confirm the legal existence of prospective employers.</li>
              <li><strong>Investment Due Diligence:</strong> Check the operational status (Active, Deregistered, Under Receivership) of target companies.</li>
            </ul>
          </div>
          <div className="border border-white/10 rounded-xl p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-3">What Information Can You Find?</h2>
            <ul className="space-y-2 text-sm list-disc list-inside">
              <li><strong>Registration Number:</strong> The official company registration ID (e.g., PVT-XXXXXX in Kenya).</li>
              <li><strong>Entity Type:</strong> Private Limited, Public Limited, Sole Proprietorship, NGO, etc.</li>
              <li><strong>Registration Date:</strong> The exact date the business was legally incorporated.</li>
              <li><strong>Current Status:</strong> Whether the company is Active, Inactive, Struck Off, or Under Liquidation.</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

import { db, safeQuery } from '@/lib/db/client';
import { businesses, businessTypes } from '@/lib/db/schema/compliance';
import { countries } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and } from 'drizzle-orm';
import { BusinessCard } from '@/components/compliance/BusinessCard';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildItemListSchema, buildBreadcrumbSchema } from '@/components/seo/schemas';
import { GlobalFilterBar, FilterConfig } from '@/components/shared/GlobalFilterBar';
import { RelatedGuides } from '@/components/guides/RelatedGuides';
import { Search, SlidersHorizontal, Inbox, Building2, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { complianceRequirements } from '@/lib/db/schema/compliance';
import { ResourceCard } from '@/components/compliance/ResourceCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Business Registry & Compliance',
  description:
    'Search and verify registered businesses across East Africa. Access compliance requirements, permits, and licensing guides for Kenya, Tanzania, Uganda, and Rwanda.',
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
  ],
  openGraph: {
    title: 'Business Registry & Compliance',
    description:
      'Search registered companies and verify compliance across African jurisdictions — Kenya, Tanzania, Uganda, Rwanda.',
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

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = params.q || '';
  const status = params.status || 'active';
  
  const conditions = [
    q ? ilike(businesses.name, `%${q}%`) : undefined,
    status && status !== 'all' ? eq(businesses.status, status) : undefined,
  ].filter(Boolean);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
    .limit(20));

  const resources = await safeQuery(db
    .select({
      resource: complianceRequirements,
      country: countries.name,
    })
    .from(complianceRequirements)
    .leftJoin(countries, eq(complianceRequirements.countryId, countries.id))
    .orderBy(desc(complianceRequirements.createdAt))
    .limit(50));

  const complianceFilters: FilterConfig[] = [
    {
      id: 'q',
      type: 'search',
      label: 'Search Companies',
      placeholder: 'Search companies by name...',
    },
    {
      id: 'status',
      type: 'pills',
      options: [
        { value: 'all', label: 'All' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'suspended', label: 'Suspended' },
      ],
      defaultValue: 'active'
    }
  ];

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8">
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
            {['all', 'form', 'calculator', 'guideline', 'notice'].map((t) => (
              <Button key={t} variant="secondary" size="sm" className="rounded-full capitalize">
                {t}
              </Button>
            ))}
          </div>

          {resources.length === 0 ? (
            <>
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-white/10 rounded-xl bg-white/5 border-dashed">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Compliance resources coming soon</h3>
                <p className="text-muted-foreground max-w-md">
                  We are actively indexing official compliance resources, tax guidelines, and business registration forms from East African authorities. Check back soon.
                </p>
              </div>

              {/* SEO-rich static content for Googlebot when DB is empty */}
              <section className="mt-12 space-y-8 text-muted-foreground">
                <div className="border border-white/10 rounded-xl p-6 bg-white/5">
                  <h2 className="text-xl font-bold text-foreground mb-3">East Africa Business Compliance Guidelines</h2>
                  <p className="leading-relaxed">
                    Navigating regulatory compliance and business registration in East Africa can be complex. Our compliance resource hub consolidates official forms, tax calculators, guidelines, and regulatory notices from key government bodies across Kenya, Tanzania, Uganda, and Rwanda into a single, searchable directory.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-white/10 rounded-xl p-6 bg-white/5">
                    <h2 className="text-lg font-semibold text-foreground mb-2">Supported Authorities</h2>
                    <ul className="space-y-1 text-sm list-disc list-inside">
                      <li><strong>Kenya:</strong> KRA (Kenya Revenue Authority), BRS (Business Registration Service), NSSF, NHIF</li>
                      <li><strong>Tanzania:</strong> TRA (Tanzania Revenue Authority), BRELA (Business Registrations and Licensing Agency)</li>
                      <li><strong>Uganda:</strong> URA (Uganda Revenue Authority), URSB (Uganda Registration Services Bureau)</li>
                      <li><strong>Rwanda:</strong> RDB (Rwanda Development Board), RRA (Rwanda Revenue Authority)</li>
                    </ul>
                  </div>
                  <div className="border border-white/10 rounded-xl p-6 bg-white/5">
                    <h2 className="text-lg font-semibold text-foreground mb-2">Available Resource Types</h2>
                    <ul className="space-y-1 text-sm list-disc list-inside">
                      <li><strong>Forms:</strong> Official PDF forms for tax returns, company registration, and annual returns.</li>
                      <li><strong>Calculators:</strong> PAYE, VAT, and corporate tax estimation tools.</li>
                      <li><strong>Guidelines:</strong> Step-by-step PDF manuals on regulatory compliance.</li>
                      <li><strong>Notices:</strong> Recent gazette notices and regulatory updates from government agencies.</li>
                    </ul>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map(({ resource, country }) => (
                <ResourceCard
                  key={resource.id}
                  title={resource.title}
                  description={resource.description}
                  resourceType={resource.resourceType as any}
                  issuingAuthority={resource.issuingAuthority}
                  sourceUrl={resource.sourceUrl}
                  country={country || 'Unknown'}
                  lastVerifiedAt={resource.lastVerifiedAt}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="businesses" className="space-y-6">
          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['all', 'active', 'inactive', 'deregistered'].map((s) => (
              <Link key={s} href={`/compliance?${new URLSearchParams({ ...(q ? { q } : {}), ...(s !== 'all' ? { status: s } : {}) }).toString()}`}>
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
            <>
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-white/10 rounded-xl bg-white/5 border-dashed">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Inbox className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Business registry sync in progress</h3>
                <p className="text-muted-foreground max-w-md">
                  We are currently syncing company registration records with national business registries across East Africa. Check back soon.
                </p>
                {(q || (status && status !== 'all')) && (
                  <Link href="/compliance" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
                    Clear all filters
                  </Link>
                )}
              </div>

              {/* SEO-rich static content for Googlebot when DB is empty */}
              <section className="mt-12 space-y-8 text-muted-foreground">
                <div className="border border-white/10 rounded-xl p-6 bg-white/5">
                  <h2 className="text-xl font-bold text-foreground mb-3">Verify Company Registration Status in East Africa</h2>
                  <p className="leading-relaxed">
                    Due diligence is a critical step before entering into any business agreement, partnership, or employment contract. The AkiliBrain Business Search tool allows you to instantly verify the registration status, legal entity type, and directorship of companies registered in Kenya, Tanzania, Uganda, and Rwanda by querying data directly from official national registries.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-white/10 rounded-xl p-6 bg-white/5">
                    <h2 className="text-lg font-semibold text-foreground mb-2">Why Verify Business Registration?</h2>
                    <ul className="space-y-1 text-sm list-disc list-inside">
                      <li><strong>Prevent Fraud:</strong> Ensure you are dealing with a legally recognized corporate entity.</li>
                      <li><strong>Procurement Compliance:</strong> Verify the legitimacy of vendors and suppliers before awarding contracts.</li>
                      <li><strong>Employment Safety:</strong> Job seekers can confirm the legal existence of prospective employers.</li>
                      <li><strong>Investment Due Diligence:</strong> Check the operational status (Active, Deregistered, Under Receivership) of target companies.</li>
                    </ul>
                  </div>
                  <div className="border border-white/10 rounded-xl p-6 bg-white/5">
                    <h2 className="text-lg font-semibold text-foreground mb-2">What Information Can You Find?</h2>
                    <ul className="space-y-1 text-sm list-disc list-inside">
                      <li><strong>Registration Number:</strong> The official company registration ID (e.g., PVT-XXXXXX in Kenya).</li>
                      <li><strong>Entity Type:</strong> Private Limited, Public Limited, Sole Proprietorship, NGO, etc.</li>
                      <li><strong>Registration Date:</strong> The exact date the business was legally incorporated.</li>
                      <li><strong>Current Status:</strong> Whether the company is Active, Inactive, Struck Off, or Under Liquidation.</li>
                    </ul>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.map(({ business, country, type }) => (
                <BusinessCard
                  key={business.id}
                  id={business.id}
                  name={business.name}
                  registrationNumber={business.registrationNumber}
                  country={country || 'Unknown'}
                  type={type || undefined}
                  status={business.status}
                  registrationDate={business.registrationDate}
                  directorsCount={business.directors?.length || 0}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Related Guides Interweave */}
      <div className="pt-10 mt-8 border-t border-white/5">
        <RelatedGuides category="compliance" title="Compliance & Registration Guides" />
      </div>
    </div>
  );
}

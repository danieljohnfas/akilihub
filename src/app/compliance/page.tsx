import { db } from '@/lib/db/client';
import { businesses, businessTypes } from '@/lib/db/schema/compliance';
import { countries } from '@/lib/db/schema/shared';
import { eq, desc, ilike, and } from 'drizzle-orm';
import { BusinessCard } from '@/components/compliance/BusinessCard';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Search, SlidersHorizontal, Inbox } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Business Registry | AkiliBrain Compliance',
  description: 'Search and verify registered businesses across Africa.',
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

  const data = await db
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
    .limit(20);

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Business Registry</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Search registered companies and verify compliance status across African jurisdictions.
          </p>
        </div>
        
        <form className="w-full md:w-auto flex items-center gap-2" action="/compliance" method="GET">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              name="q"
              placeholder="Search companies by name..." 
              className="pl-9 bg-white/5 border-white/10 focus-visible:ring-primary/50"
              defaultValue={q}
            />
            {status && status !== 'all' && <input type="hidden" name="status" value={status} />}
          </div>
          <Button variant="outline" size="icon" type="button" className="shrink-0 bg-white/5 border-white/10">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </form>
      </div>

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
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-white/10 rounded-xl bg-white/5 border-dashed">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No businesses found</h3>
          <p className="text-muted-foreground max-w-md">
            We couldn't find any registered companies matching your search criteria in our database.
          </p>
          {(q || (status && status !== 'all')) && (
            <Link href="/compliance" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
              Clear all filters
            </Link>
          )}
        </div>
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
    </div>
  );
}

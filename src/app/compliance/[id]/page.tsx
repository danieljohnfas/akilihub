import { db } from '@/lib/db/client';
import { businesses, businessTypes } from '@/lib/db/schema/compliance';
import { countries } from '@/lib/db/schema/shared';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Building2, MapPin, CheckCircle2, XCircle, ArrowLeft, Users, FileText, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const data = await db.select({ name: businesses.name }).from(businesses).where(eq(businesses.id, resolvedParams.id)).limit(1);
  if (!data.length) return { title: 'Business Not Found' };
  
  return {
    title: `${data[0].name} | AkiliBrain Compliance`,
  };
}

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  
  const data = await db
    .select({
      business: businesses,
      country: countries.name,
      type: businessTypes.name,
    })
    .from(businesses)
    .leftJoin(countries, eq(businesses.countryId, countries.id))
    .leftJoin(businessTypes, eq(businesses.typeId, businessTypes.id))
    .where(eq(businesses.id, resolvedParams.id))
    .limit(1);

  if (!data.length) {
    notFound();
  }

  const { business, country, type } = data[0];
  const isActive = business.status.toLowerCase() === 'active';

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-8">
      {/* Back Button */}
      <Link href="/compliance" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Registry
      </Link>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            Reg No: {business.registrationNumber}
          </Badge>
          <Badge 
            variant={isActive ? 'default' : 'secondary'}
            className={isActive ? 'bg-emerald-500/20 text-emerald-400' : ''}
          >
            {isActive ? (
              <CheckCircle2 className="w-3 h-3 mr-1" />
            ) : (
              <XCircle className="w-3 h-3 mr-1" />
            )}
            {business.status.toUpperCase()}
          </Badge>
          {type && (
            <Badge variant="secondary" className="bg-white/5">
              {type}
            </Badge>
          )}
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">
          {business.name}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-8">
          {/* Directors Section */}
          <section className="space-y-4 bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Board of Directors
            </h2>
            {business.directors && business.directors.length > 0 ? (
              <ul className="space-y-2 text-muted-foreground list-disc pl-5">
                {business.directors.map((director, idx) => (
                  <li key={idx}>{director}</li>
                ))}
              </ul>
            ) : (
              <p className="italic text-muted-foreground">No directors listed in the public registry.</p>
            )}
          </section>

          {/* Registration Info */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground mb-1">Registration Date</p>
              <p className="font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {business.registrationDate ? format(business.registrationDate, 'PPP') : 'Unknown'}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground mb-1">Data Last Updated</p>
              <p className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                {format(business.updatedAt, 'PPP')}
              </p>
            </div>
          </section>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-card border border-white/10 rounded-xl p-6 space-y-6 sticky top-24">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Entity Type</p>
              <p className="font-medium flex items-start gap-2">
                <Building2 className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <span>{type || 'Standard Business'}</span>
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Jurisdiction</p>
              <p className="font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0 text-primary" />
                <span>{country || 'Unknown'}</span>
              </p>
            </div>

            {business.address && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Registered Address</p>
                <p className="font-medium flex items-start gap-2">
                  <FileText className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="text-sm whitespace-pre-wrap">{business.address}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

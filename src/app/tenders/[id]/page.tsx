import { db, safeQuery } from '@/lib/db/client';
import { tenders, tenderSectors } from '@/lib/db/schema/tenders';
import { countries } from '@/lib/db/schema/shared';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Calendar, Building2, MapPin, DollarSign, ExternalLink, ArrowLeft, Download, FileText, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { format } from 'date-fns';
import Link from 'next/link';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const data = await safeQuery(db.select({ title: tenders.title }).from(tenders).where(eq(tenders.id, resolvedParams.id)).limit(1));
  if (!data.length) return { title: 'Tender Not Found' };
  
  return {
    title: `${data[0].title} | AkiliBrain Procurement`,
  };
}

export default async function TenderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  
  const data = await safeQuery(db
    .select({
      tender: tenders,
      country: countries.name,
      sector: tenderSectors.name,
    })
    .from(tenders)
    .leftJoin(countries, eq(tenders.countryId, countries.id))
    .leftJoin(tenderSectors, eq(tenders.sectorId, tenderSectors.id))
    .where(eq(tenders.id, resolvedParams.id))
    .limit(1));

  if (!data.length) {
    notFound();
  }

  const { tender, country, sector } = data[0];
  const isExpired = tender.deadline < new Date();

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-8">
      {/* Back Button */}
      <Link href="/tenders" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Tenders
      </Link>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {tender.referenceNo}
          </Badge>
          <Badge 
            variant={tender.status === 'open' && !isExpired ? 'default' : 'secondary'}
            className={tender.status === 'open' && !isExpired ? 'bg-emerald-500/20 text-emerald-400' : ''}
          >
            {isExpired ? 'Expired' : tender.status.toUpperCase()}
          </Badge>
          {sector && (
            <Badge variant="secondary" className="bg-white/5">
              {sector}
            </Badge>
          )}
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">
          {tender.title}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-8">
          <section className="space-y-4 bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Description
            </h2>
            <div className="prose prose-invert max-w-none text-muted-foreground">
              {tender.description ? (
                <p className="whitespace-pre-wrap">{tender.description}</p>
              ) : (
                <p className="italic">No detailed description provided by the authority.</p>
              )}
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground mb-1">Published Date</p>
              <p className="font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {tender.publishedAt ? format(tender.publishedAt, 'PPP') : 'N/A'}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
              <p className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                {format(tender.updatedAt, 'PPP')}
              </p>
            </div>
          </section>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-card border border-white/10 rounded-xl p-6 space-y-6 sticky top-24">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Contracting Authority</p>
              <p className="font-medium flex items-start gap-2">
                <Building2 className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <span>{tender.contractingAuthority}</span>
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0 text-primary" />
                <span>{country || 'Unknown'}</span>
              </p>
            </div>

            {tender.budget && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Estimated Budget</p>
                <p className="font-medium text-emerald-400 flex items-center gap-2 text-lg">
                  <DollarSign className="w-5 h-5 shrink-0" />
                  <span>{tender.currency} {Number(tender.budget).toLocaleString()}</span>
                </p>
              </div>
            )}

            <div className="space-y-1 pt-4 border-t border-white/10">
              <p className="text-sm text-muted-foreground">Deadline</p>
              <p className={`font-semibold flex items-center gap-2 text-lg ${isExpired ? 'text-destructive/80' : 'text-amber-400'}`}>
                <Calendar className="w-5 h-5 shrink-0" />
                {format(tender.deadline, 'PPP')}
              </p>
              <p className="text-xs text-muted-foreground pl-7">
                {format(tender.deadline, 'p')}
              </p>
            </div>

            <div className="pt-6 space-y-3">
              {tender.sourceUrl && (
                <a 
                  href={tender.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={buttonVariants({ className: "w-full" })}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Original Source
                </a>
              )}
              {tender.documentUrl && (
                <a 
                  href={tender.documentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={buttonVariants({ variant: "secondary", className: "w-full" })}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Document
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

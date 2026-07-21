import { db, safeQuery } from '@/lib/db/client';
import { tenders } from '@/lib/db/schema/tenders';
import { countries } from '@/lib/db/schema/shared';
import { gte, eq, asc } from 'drizzle-orm';
import { TenderCard } from '@/components/tenders/TenderCard';
import { Calendar as CalendarIcon, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format, isSameDay } from 'date-fns';

export const metadata = {
  title: 'Tender Deadlines Calendar | AkiliBrain',
  description: 'View upcoming tender and procurement deadlines across East Africa.',
};

export default async function TendersCalendarPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all open tenders with deadlines in the future, ordered by deadline ascending
  const upcomingTenders = await safeQuery(
    db.select({
      tender: tenders,
      country: countries.name
    })
    .from(tenders)
    .innerJoin(countries, eq(tenders.countryId, countries.id))
    .where(gte(tenders.deadline, today))
    .orderBy(asc(tenders.deadline))
  );

  // Group by day for simple vertical timeline rendering
  const groupedByDay: Record<string, typeof upcomingTenders> = {};
  
  upcomingTenders.forEach(item => {
    const dayKey = format(item.tender.deadline, 'yyyy-MM-dd');
    if (!groupedByDay[dayKey]) {
      groupedByDay[dayKey] = [];
    }
    groupedByDay[dayKey].push(item);
  });

  const sortedDays = Object.keys(groupedByDay).sort();

  return (
    <div className="container py-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild className="hover:bg-white/10 rounded-full h-10 w-10 shrink-0">
          <Link href="/tenders">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-primary" />
            Deadline Calendar
          </h1>
          <p className="text-muted-foreground mt-1">Upcoming procurement opportunities by closing date.</p>
        </div>
      </div>

      {sortedDays.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-white/10 rounded-xl bg-white/5 border-dashed">
          <Clock className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No upcoming deadlines</h3>
          <p className="text-muted-foreground max-w-md">
            Check back later for new opportunities.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {sortedDays.map((day) => {
            const dateObj = new Date(day);
            const isToday = isSameDay(dateObj, new Date());
            
            return (
              <div key={day} className="relative">
                <div className="flex items-center gap-4 mb-6 sticky top-[65px] z-30 bg-background/95 backdrop-blur py-2 border-b border-white/5">
                  <div className={`flex flex-col items-center justify-center h-14 w-14 rounded-2xl border ${isToday ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'bg-white/5 border-white/10 text-muted-foreground'}`}>
                    <span className="text-xs uppercase font-semibold">{format(dateObj, 'MMM')}</span>
                    <span className="text-xl font-bold leading-none">{format(dateObj, 'dd')}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground/90">
                      {isToday ? 'Today' : format(dateObj, 'EEEE')}
                    </h2>
                    <p className="text-sm text-muted-foreground">{groupedByDay[day].length} {groupedByDay[day].length === 1 ? 'deadline' : 'deadlines'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-2 border-l border-white/10 ml-7">
                  {groupedByDay[day].map(({ tender, country }) => (
                    <div key={tender.id} className="relative">
                      <div className="absolute w-4 h-[1px] bg-white/10 -left-6 top-10" />
                      <TenderCard
                        id={tender.id}
                        title={tender.title}
                        referenceNo={tender.referenceNo}
                        contractingAuthority={tender.contractingAuthority}
                        country={country || 'Unknown'}
                        sector={tender.sectorId || undefined}
                        status={tender.status}
                        deadline={tender.deadline}
                        budget={tender.budget}
                        currency={tender.currency}
                        documentUrl={tender.documentUrl}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

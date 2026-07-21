import Link from 'next/link';
import { Calendar, Building2, MapPin, DollarSign, FileText } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatDistanceToNow, differenceInDays } from 'date-fns';

export interface TenderCardProps {
  id: string;
  title: string;
  referenceNo: string;
  contractingAuthority: string;
  country: string;
  sector?: string;
  status: 'open' | 'closed' | 'awarded' | 'cancelled';
  deadline: Date;
  budget?: string | null;
  currency?: string | null;
}

export function TenderCard({
  id,
  title,
  referenceNo,
  contractingAuthority,
  country,
  sector,
  status,
  deadline,
  budget,
  currency,
}: TenderCardProps) {
  const isExpired = deadline < new Date();
  const daysRemaining = differenceInDays(deadline, new Date());
  const isUrgent = daysRemaining >= 0 && daysRemaining <= 3 && status === 'open';
  
  return (
    <Card className="group hover:border-primary/50 transition-all duration-300 bg-white/5 backdrop-blur-sm border-white/10 flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start gap-4 mb-2">
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
            {referenceNo}
          </Badge>
          <div className="flex items-center gap-2">
            {isUrgent && (
              <Badge variant="destructive" className="animate-pulse shadow-md shadow-red-500/20">
                Closes in {daysRemaining === 0 ? 'today' : `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`}
              </Badge>
            )}
            <Badge 
              variant={status === 'open' && !isExpired ? 'default' : 'secondary'}
              className={status === 'open' && !isExpired ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : ''}
            >
              {isExpired ? 'Expired' : status.toUpperCase()}
            </Badge>
          </div>
        </div>
        <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
      </CardHeader>
      
      <CardContent className="pb-4 flex-1 space-y-3 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <Building2 className="w-4 h-4 shrink-0 text-primary mt-0.5" />
          <div className="min-w-0">
            <span className="text-xs text-white/40 uppercase tracking-wider font-semibold block leading-none mb-0.5">Authority</span>
            <span className="text-sm font-medium text-white/90 leading-snug line-clamp-2">{contractingAuthority}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>{country}</span>
          {sector && (
            <>
              <span className="text-white/20">•</span>
              <span className="truncate">{sector}</span>
            </>
          )}
        </div>

        {budget && (
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="text-emerald-400 font-medium">
              {currency} {Number(budget).toLocaleString()}
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-white/60">
          <Calendar className="w-3.5 h-3.5" />
          <span className={isExpired ? 'text-destructive/80' : 'text-amber-400/90'}>
            Due {formatDistanceToNow(deadline, { addSuffix: true })}
          </span>
        </div>
        <Link 
          href={`/tenders/${id}`}
          className={buttonVariants({ 
            size: "sm", 
            variant: "secondary", 
            className: "group-hover:bg-primary group-hover:text-primary-foreground transition-all" 
          })}
        >
          <FileText className="w-4 h-4 mr-2" />
          View Details
        </Link>
      </CardFooter>
    </Card>
  );
}

import Link from 'next/link';
import { Calendar, Building2, MapPin, DollarSign, FileText, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { ShareButton } from '@/components/shared/ShareButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  documentUrl?: string | null;
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
  documentUrl,
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
          className="absolute inset-0 z-10"
        />
        <div className="flex items-center gap-2">
          {documentUrl && (
            <Dialog>
              <DialogTrigger 
                className={buttonVariants({ variant: "outline", size: "sm", className: "relative z-20 h-8 gap-1.5 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white" })}
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs">PDF</span>
              </DialogTrigger>
              <DialogContent className="max-w-4xl w-[90vw] h-[85vh] p-0 gap-0 overflow-hidden bg-black/95 border-white/10">
                <DialogHeader className="p-4 border-b border-white/10 bg-black/40 backdrop-blur-md absolute top-0 left-0 right-0 z-10">
                  <DialogTitle className="text-lg pr-8 truncate">
                    {title}
                  </DialogTitle>
                </DialogHeader>
                <div className="w-full h-full pt-[65px] bg-white">
                  <object
                    data={documentUrl}
                    type="application/pdf"
                    className="w-full h-full"
                  >
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-black p-8">
                      <FileText className="w-12 h-12 text-muted-foreground" />
                      <p>Your browser doesn't support embedded PDFs.</p>
                      <Link 
                        href={documentUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={buttonVariants({ variant: "outline", className: "border-black/20 hover:bg-black/5 text-black" })}
                      >
                        Download PDF
                      </Link>
                    </div>
                  </object>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <BookmarkButton itemId={id} itemType="tender" className="hover:bg-white/10" />
          <ShareButton url={`/tenders/${id}`} title={title} className="hover:bg-white/10" />
          <div className="relative z-20 flex items-center text-sm font-medium text-primary group-hover:text-primary/80 transition-colors ml-2">
            View Details
            <ExternalLink className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

import Link from 'next/link';
import { Building2, MapPin, CheckCircle2, XCircle, Users } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export interface BusinessCardProps {
  id: string;
  name: string;
  registrationNumber: string;
  country: string;
  type?: string;
  status: string;
  registrationDate?: Date | null;
  directorsCount?: number;
}

export function BusinessCard({
  id,
  name,
  registrationNumber,
  country,
  type,
  status,
  registrationDate,
  directorsCount = 0,
}: BusinessCardProps) {
  const isActive = status.toLowerCase() === 'active';
  
  return (
    <Card className="group hover:border-primary/50 transition-all duration-300 bg-white/5 backdrop-blur-sm border-white/10 flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start gap-4 mb-2">
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
            {registrationNumber}
          </Badge>
          <Badge 
            variant={isActive ? 'default' : 'secondary'}
            className={isActive ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : ''}
          >
            {isActive ? (
              <CheckCircle2 className="w-3 h-3 mr-1" />
            ) : (
              <XCircle className="w-3 h-3 mr-1" />
            )}
            {status.toUpperCase()}
          </Badge>
        </div>
        <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
          {name}
        </h3>
      </CardHeader>
      
      <CardContent className="pb-4 flex-1 space-y-3 text-sm text-muted-foreground">
        {type && (
          <div className="flex items-start gap-2">
            <Building2 className="w-4 h-4 shrink-0 text-primary mt-0.5" />
            <div className="min-w-0">
              <span className="text-xs text-white/40 uppercase tracking-wider font-semibold block leading-none mb-0.5">Entity Type</span>
              <span className="text-sm font-medium text-white/90 leading-snug line-clamp-2">{type}</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>{country}</span>
        </div>

        {directorsCount > 0 && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>{directorsCount} Directors listed</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-white/60">
          {registrationDate ? (
            <span>Registered {formatDistanceToNow(registrationDate, { addSuffix: true })}</span>
          ) : (
            <span>Registration date unknown</span>
          )}
        </div>
        <Link 
          href={`/compliance/${id}`}
          className={buttonVariants({ 
            size: "sm", 
            variant: "secondary", 
            className: "group-hover:bg-primary group-hover:text-primary-foreground transition-all" 
          })}
        >
          View Profile
        </Link>
      </CardFooter>
    </Card>
  );
}

import { Building2, MapPin, Briefcase, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export interface SalaryCardProps {
  id: string;
  jobTitle: string;
  employerName?: string;
  sector?: string;
  country: string;
  experienceLevel: string;
  employmentType: string;
  grossMonthlySalary: number;
  currency: string;
  isVerified: boolean;
  submittedAt: Date;
}

export function SalaryCard({
  id,
  jobTitle,
  employerName,
  sector,
  country,
  experienceLevel,
  employmentType,
  grossMonthlySalary,
  currency,
  isVerified,
  submittedAt,
}: SalaryCardProps) {
  
  return (
    <Card className="group hover:border-primary/50 transition-all duration-300 bg-white/5 backdrop-blur-sm border-white/10 flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start gap-4 mb-2">
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 capitalize">
            {experienceLevel.replace('_', ' ')}
          </Badge>
          {isVerified ? (
            <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
              <AlertCircle className="w-3 h-3 mr-1" />
              Crowdsourced
            </Badge>
          )}
        </div>
        <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
          {jobTitle}
        </h3>
      </CardHeader>
      
      <CardContent className="pb-4 flex-1 space-y-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 shrink-0" />
          <span className="truncate">{employerName || 'Confidential Employer'}</span>
          {sector && (
            <>
              <span className="text-white/20">•</span>
              <span className="truncate">{sector}</span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>{country}</span>
        </div>

        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 shrink-0" />
          <span className="capitalize">{employmentType.replace('_', ' ')}</span>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-xs text-muted-foreground mb-1">Gross Monthly</p>
          <span className="text-emerald-400 font-bold text-xl">
            {currency} {Number(grossMonthlySalary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-4 border-t border-white/5 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Submitted {formatDistanceToNow(submittedAt, { addSuffix: true })}
        </div>
      </CardFooter>
    </Card>
  );
}

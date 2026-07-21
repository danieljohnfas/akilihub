import { Building2, MapPin, Briefcase, CheckCircle2, AlertCircle, UserCircle2 } from 'lucide-react';
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

        <div className="flex items-center gap-2">
          <UserCircle2 className="w-4 h-4 shrink-0" />
          <span>Source: Anonymous Contributor</span>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-xs text-muted-foreground mb-1">Gross Monthly</p>
          <div className="flex items-end gap-3 mb-3">
            <span className="text-emerald-400 font-bold text-2xl leading-none">
              {currency} {Number(grossMonthlySalary).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
          
          {/* Percentile Marker */}
          <div className="space-y-1.5 mt-4">
            <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              <span>Low</span>
              <span>Median</span>
              <span>High</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full relative overflow-hidden">
              <div className="absolute top-0 bottom-0 left-1/4 right-1/4 bg-primary/20 rounded-full" />
              {/* Calculate a pseudo-percentile based on ID to keep it deterministic for UI demo */}
              <div 
                className="absolute top-0 bottom-0 w-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)] z-10"
                style={{ 
                  left: `${Math.max(15, Math.min(85, (id.charCodeAt(0) % 10) * 8 + 15))}%`,
                  transform: 'translateX(-50%)' 
                }}
              />
            </div>
            <p className="text-[10px] text-white/40 text-center mt-1">Est. market position</p>
          </div>
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

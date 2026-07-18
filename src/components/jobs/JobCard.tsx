import Link from 'next/link';
import { Calendar, Building2, MapPin, Briefcase, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export interface JobCardProps {
  id: string;
  title: string;
  companyName: string;
  description: string;
  requirements?: string | null;
  location: string | null;
  country: string;
  jobType: 'full_time' | 'part_time' | 'contract' | 'internship' | 'remote';
  sourceUrl: string;
  postedDate: Date | null;
  deadline: Date | null;
}

const jobTypeLabels: Record<JobCardProps['jobType'], string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  internship: 'Internship',
  remote: 'Remote',
};

const jobTypeColors: Record<JobCardProps['jobType'], string> = {
  full_time: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  part_time: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  contract: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  internship: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  remote: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

export function JobCard({
  id,
  title,
  companyName,
  description,
  requirements,
  location,
  country,
  jobType,
  sourceUrl,
  postedDate,
  deadline,
}: JobCardProps) {
  const isExpired = deadline ? deadline < new Date() : false;

  return (
    <Card className="group relative hover:border-primary/50 transition-all duration-300 bg-white/5 backdrop-blur-sm border-white/10 flex flex-col focus-within:ring-2 focus-within:ring-primary/50">
      <Link href={`/jobs/${id}`} className="absolute inset-0 z-10">
        <span className="sr-only">View Details for {title}</span>
      </Link>
      
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start gap-4 mb-2">
          <Badge
            variant="outline"
            className={`text-xs border ${jobTypeColors[jobType]}`}
          >
            {jobTypeLabels[jobType]}
          </Badge>
          {isExpired && (
            <Badge variant="secondary" className="text-xs relative z-20">Expired</Badge>
          )}
        </div>
        <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors underline-offset-4 group-hover:underline">
          {title}
        </h3>
      </CardHeader>

      <CardContent className="pb-4 flex-1 space-y-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 shrink-0 text-primary" />
          <span className="truncate font-medium text-white/80">
            Recruiting: <span className="text-white">{companyName}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>{location && location !== 'null' ? location : country}</span>
        </div>

        {description && description !== 'null' && description.trim() !== '' && (
          <p className="line-clamp-2 text-white/50 leading-relaxed mt-2">
            {description}
          </p>
        )}
        
        {requirements && requirements !== 'null' && requirements.trim() !== '' && (
          <div className="pt-2">
            <span className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1 block">Requirements</span>
            <p className="line-clamp-2 text-white/50 leading-relaxed text-xs">
              {requirements}
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4 border-t border-white/5 flex items-center justify-between bg-black/20 rounded-b-xl">
        <div className="flex items-center gap-2 text-xs font-medium text-white/60">
          <Calendar className="w-3.5 h-3.5" />
          {deadline ? (
            <span className={isExpired ? 'text-destructive/80' : 'text-amber-400/90'}>
              {isExpired ? 'Closed' : `Due ${formatDistanceToNow(deadline, { addSuffix: true })}`}
            </span>
          ) : postedDate ? (
            <span>Posted {formatDistanceToNow(postedDate, { addSuffix: true })}</span>
          ) : (
            <span>Posted recently</span>
          )}
        </div>
        <div className="relative z-20 flex items-center text-sm font-medium text-primary group-hover:text-primary/80 transition-colors">
          View Details
          <ExternalLink className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </CardFooter>
    </Card>
  );
}

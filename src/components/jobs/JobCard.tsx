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
  location,
  country,
  jobType,
  sourceUrl,
  postedDate,
  deadline,
}: JobCardProps) {
  const isExpired = deadline ? deadline < new Date() : false;

  return (
    <Card className="group hover:border-primary/50 transition-all duration-300 bg-white/5 backdrop-blur-sm border-white/10 flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start gap-4 mb-2">
          <Badge
            variant="outline"
            className={`text-xs border ${jobTypeColors[jobType]}`}
          >
            {jobTypeLabels[jobType]}
          </Badge>
          {isExpired && (
            <Badge variant="secondary" className="text-xs">Expired</Badge>
          )}
        </div>
        <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
      </CardHeader>

      <CardContent className="pb-4 flex-1 space-y-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 shrink-0" />
          <span className="truncate font-medium text-white/80">{companyName}</span>
        </div>

        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>{location || country}</span>
        </div>

        <p className="line-clamp-3 text-white/50 leading-relaxed">
          {description}
        </p>
      </CardContent>

      <CardFooter className="pt-4 border-t border-white/5 flex items-center justify-between">
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
        <Link
          href={`/jobs/${id}`}
          className={buttonVariants({
            size: 'sm',
            variant: 'secondary',
            className: 'group-hover:bg-primary group-hover:text-primary-foreground transition-all',
          })}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View Details
        </Link>
      </CardFooter>
    </Card>
  );
}

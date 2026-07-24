import Link from 'next/link';
import { Calendar, Building2, MapPin, Briefcase, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { ShareButton } from '@/components/shared/ShareButton';

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
  createdAt: Date;
  layout?: 'grid' | 'list';
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
  createdAt,
  layout = 'grid',
}: JobCardProps) {
  const isExpired = deadline ? deadline < new Date() : false;

  if (layout === 'list') {
    return (
      <Card className="group relative hover:border-primary/50 transition-all duration-300 bg-white/5 backdrop-blur-sm border-white/10 flex flex-col md:flex-row items-start md:items-center p-4 gap-4 focus-within:ring-2 focus-within:ring-primary/50">
        <Link href={`/jobs/${id}`} className="absolute inset-0 z-10">
          <span className="sr-only">View Details for {title}</span>
        </Link>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold group-hover:text-primary transition-colors underline-offset-4 group-hover:underline">
              {title}
            </h3>
            {isExpired && <Badge variant="secondary" className="text-[10px] h-4 px-1 z-20 relative">Expired</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium text-white/90">{companyName}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{location && location !== 'null' ? location : country}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto mt-2 md:mt-0">
          <Badge variant="outline" className={`text-xs border ${jobTypeColors[jobType]}`}>
            {jobTypeLabels[jobType]}
          </Badge>
          <div className="flex items-center gap-1">
            <BookmarkButton itemId={id} itemType="job" />
            <ShareButton url={`/jobs/${id}`} title={title} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/60 md:w-32 md:justify-end ml-auto md:ml-0">
            <Calendar className="w-3.5 h-3.5" />
            <span className="truncate">
              {deadline ? (isExpired ? 'Closed' : `Due ${formatDistanceToNow(deadline)}`) : postedDate ? `${formatDistanceToNow(postedDate)}` : `Found ${formatDistanceToNow(createdAt)}`}
            </span>
          </div>
        </div>
      </Card>
    );
  }

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
        <h3 className="text-lg font-semibold group-hover:text-primary transition-colors underline-offset-4 group-hover:underline">
          {title}
        </h3>
      </CardHeader>

      <CardContent className="pb-4 flex-1 space-y-3 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <Building2 className="w-4 h-4 shrink-0 text-primary mt-0.5" />
          <div className="min-w-0">
            <span className="text-xs text-white/40 uppercase tracking-wider font-semibold block leading-none mb-0.5">Recruiter</span>
            <span className="text-sm font-semibold text-primary/90 leading-snug line-clamp-2">{companyName}</span>
          </div>
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
            <span>Found {formatDistanceToNow(createdAt, { addSuffix: true })}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <BookmarkButton itemId={id} itemType="job" className="hover:bg-white/10" />
          <ShareButton url={`/jobs/${id}`} title={title} className="hover:bg-white/10" />
          <div className="relative z-20 flex items-center text-sm font-medium text-primary group-hover:text-primary/80 transition-colors ml-2">
            View Details
            <ExternalLink className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

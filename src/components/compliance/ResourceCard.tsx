import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calculator, FileWarning, ExternalLink, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface ResourceCardProps {
  title: string;
  description: string;
  resourceType: 'form' | 'calculator' | 'guideline' | 'notice';
  issuingAuthority: string;
  sourceUrl: string | null;
  country: string;
  lastVerifiedAt: Date | null;
}

const typeConfig = {
  form: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  calculator: { icon: Calculator, color: 'text-green-400', bg: 'bg-green-400/10' },
  guideline: { icon: FileText, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  notice: { icon: FileWarning, color: 'text-orange-400', bg: 'bg-orange-400/10' },
};

export function ResourceCard({
  title,
  description,
  resourceType,
  issuingAuthority,
  sourceUrl,
  country,
  lastVerifiedAt,
}: ResourceCardProps) {
  const { icon: Icon, color, bg } = typeConfig[resourceType] || typeConfig.guideline;

  return (
    <Card className="flex flex-col bg-white/5 border-white/10 hover:border-white/20 transition-all group">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start gap-4 mb-2">
          <div className={`p-2 rounded-lg ${bg}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-black/20 capitalize">
              {country}
            </Badge>
            <Badge variant="outline" className="bg-black/20 capitalize">
              {resourceType}
            </Badge>
          </div>
        </div>
        <CardTitle className="text-lg line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {title}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground font-medium mt-1">
          {issuingAuthority}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {description}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-4 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>
            {lastVerifiedAt
              ? `Verified ${formatDistanceToNow(lastVerifiedAt, { addSuffix: true })}`
              : 'Recently added'}
          </span>
        </div>
        {sourceUrl && (
          <Link 
            href={sourceUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-1.5 hover:bg-white/10"
          >
            Access Tool
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}

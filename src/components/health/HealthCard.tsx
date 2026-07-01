import { Activity, MapPin, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export interface HealthCardProps {
  id: string;
  indicatorName: string;
  category: string;
  country: string;
  value: number;
  unit: string;
  year: number;
  source: string;
  updatedAt: Date;
}

export function HealthCard({
  id,
  indicatorName,
  category,
  country,
  value,
  unit,
  year,
  source,
  updatedAt,
}: HealthCardProps) {
  
  return (
    <Card className="group hover:border-primary/50 transition-all duration-300 bg-white/5 backdrop-blur-sm border-white/10 flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start gap-4 mb-2">
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 capitalize">
            {category || 'General'}
          </Badge>
          <Badge variant="secondary" className="bg-white/5">
            {year}
          </Badge>
        </div>
        <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
          {indicatorName}
        </h3>
      </CardHeader>
      
      <CardContent className="pb-4 flex-1 space-y-4">
        <div className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-xl border border-white/5">
          <span className="text-3xl font-bold text-foreground">
            {Number(value).toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground mt-1 text-center">
            {unit}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>{country}</span>
        </div>
      </CardContent>

      <CardFooter className="pt-4 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-white/60">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Source: {source}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Updated {formatDistanceToNow(updatedAt, { addSuffix: true })}
        </div>
      </CardFooter>
    </Card>
  );
}

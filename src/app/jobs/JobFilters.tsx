"use client";

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Building2, MapPin, Clock, Filter } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface JobFiltersProps {
  q: string;
  type: string;
  company: string;
  location: string;
  time: string;
  layout: string;
  uniqueCompanies: string[];
  sortedCountries: string[];
  locationsByCountry: Record<string, string[]>;
  uniqueTitles: string[];
}

export function JobFilters({
  q,
  type,
  company,
  location,
  time,
  layout,
  uniqueCompanies,
  sortedCountries,
  locationsByCountry,
  uniqueTitles,
}: JobFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset page to 1 when filters change
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  const jobTypes = [
    { value: '', label: 'All Types' },
    { value: 'full_time', label: 'Full Time' },
    { value: 'part_time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' },
    { value: 'remote', label: 'Remote' },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-white/5 mb-4">
        <Filter className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Filter & Search</h2>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="space-y-1.5 flex-1 w-full">
          <label className="text-xs text-muted-foreground font-medium pl-1">Job Title / Keyword</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              list="job-titles"
              placeholder="Software engineer..."
              className="pl-9 bg-black/20 border-white/10 focus-visible:ring-primary/50"
              defaultValue={q}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateFilters('q', e.currentTarget.value);
                }
              }}
              onBlur={(e) => updateFilters('q', e.target.value)}
            />
            <datalist id="job-titles">
              {uniqueTitles.map(t => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="space-y-1.5 flex-1 w-full">
          <label className="text-xs text-muted-foreground font-medium pl-1">Who is recruiting?</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Select value={company || 'all'} onValueChange={(val) => updateFilters('company', val)}>
              <SelectTrigger className="w-full h-10 bg-black/20 border-white/10 pl-9">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {uniqueCompanies.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5 flex-1 w-full">
          <label className="text-xs text-muted-foreground font-medium pl-1">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Select value={location || 'all'} onValueChange={(val) => updateFilters('location', val)}>
              <SelectTrigger className="w-full h-10 bg-black/20 border-white/10 pl-9">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {sortedCountries.map(country => (
                  <SelectGroup key={country}>
                    <SelectLabel className="text-white font-semibold">{country}</SelectLabel>
                    <SelectItem value={`country:${country}`} className="text-primary font-medium pl-6">All {country}</SelectItem>
                    {locationsByCountry[country].map(l => (
                      <SelectItem key={l} value={l} className="pl-6">{l}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5 flex-[0.8] w-full">
          <label className="text-xs text-muted-foreground font-medium pl-1">Posted Within</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Select value={time || 'all'} onValueChange={(val) => updateFilters('time', val)}>
              <SelectTrigger className="w-full h-10 bg-black/20 border-white/10 pl-9">
                <SelectValue placeholder="Any time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any time</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="pt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {jobTypes.map(({ value, label }) => {
          const isActive = type === value || (!type && value === '');
          return (
            <Button
              key={value}
              variant={isActive ? 'default' : 'secondary'}
              size="sm"
              className="rounded-full whitespace-nowrap h-8 text-xs bg-black/20"
              onClick={() => updateFilters('type', value)}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

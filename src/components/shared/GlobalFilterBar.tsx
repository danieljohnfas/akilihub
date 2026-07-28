"use client";

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export type FilterType = 'search' | 'select' | 'pills';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  id: string; // The URL query parameter key
  type: FilterType;
  label?: string; // For selects/search
  placeholder?: string;
  icon?: React.ReactNode;
  options?: FilterOption[]; // For select and pills
  datalist?: string[]; // For search autocomplete
  defaultValue?: string; // E.g., 'all'
}

interface GlobalFilterBarProps {
  filters: FilterConfig[];
  children?: React.ReactNode; // Custom action buttons (Calendar, Layout toggles, etc.)
}

export function GlobalFilterBar({ filters, children }: GlobalFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Some dropdowns use "all" to signify no filter
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // Always reset to page 1 when a filter changes
    params.delete('page');
    
    router.push(`${pathname}?${params.toString()}`);
  };

  // Group filters by type
  const searchFilters = filters.filter(f => f.type === 'search');
  const selectFilters = filters.filter(f => f.type === 'select');
  const pillFilters = filters.filter(f => f.type === 'pills');

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-white/5 mb-4">
        <Filter className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Filter & Search</h2>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 items-end">
        {/* Search Inputs */}
        {searchFilters.map(filter => (
          <div key={filter.id} className="space-y-1.5 flex-1 w-full">
            <label className="text-xs text-muted-foreground font-medium pl-1">{filter.label || 'Search'}</label>
            <div className="relative">
              {filter.icon ? (
                filter.icon
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              )}
              <Input
                name={filter.id}
                list={filter.datalist ? `${filter.id}-datalist` : undefined}
                placeholder={filter.placeholder || "Search..."}
                className="pl-9 bg-black/20 border-white/10 focus-visible:ring-primary/50 h-10"
                defaultValue={searchParams.get(filter.id) || ''}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateFilters(filter.id, e.currentTarget.value);
                  }
                }}
                onBlur={(e) => updateFilters(filter.id, e.target.value)}
              />
              {filter.datalist && (
                <datalist id={`${filter.id}-datalist`}>
                  {filter.datalist.map(t => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              )}
            </div>
          </div>
        ))}

        {/* Select Dropdowns */}
        {selectFilters.map(filter => (
          <div key={filter.id} className="space-y-1.5 flex-1 w-full md:max-w-[200px]">
            {filter.label && <label className="text-xs text-muted-foreground font-medium pl-1">{filter.label}</label>}
            <div className="relative">
              {filter.icon && (
                 filter.icon
              )}
              <Select 
                value={searchParams.get(filter.id) || filter.defaultValue || 'all'} 
                onValueChange={(val) => updateFilters(filter.id, val)}
              >
                <SelectTrigger className={`w-full h-10 bg-black/20 border-white/10 ${filter.icon ? 'pl-9' : 'px-3'} py-2 text-sm text-foreground`}>
                  <SelectValue placeholder={filter.placeholder || "Select..."} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options?.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}

        {/* Action Buttons (Children) */}
        {children && (
          <div className="flex items-center gap-2 shrink-0">
            {children}
          </div>
        )}
      </div>

      {/* Pill Filters */}
      {pillFilters.length > 0 && (
        <div className="pt-2 flex flex-col gap-3">
          {pillFilters.map(filter => (
            filter.options && (
              <div key={filter.id} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {filter.options.map(opt => {
                  const isActive = searchParams.get(filter.id) === opt.value || (!searchParams.get(filter.id) && opt.value === (filter.defaultValue || 'all'));
                  
                  const currentParams = new URLSearchParams(searchParams.toString());
                  if (opt.value && opt.value !== 'all') {
                    currentParams.set(filter.id, opt.value);
                  } else {
                    currentParams.delete(filter.id);
                  }
                  currentParams.delete('page');
                  const href = `${pathname}?${currentParams.toString()}`;

                  return (
                    <Link key={opt.value} href={href}>
                      <Button
                        variant={isActive ? 'default' : 'secondary'}
                        size="sm"
                        className="rounded-full whitespace-nowrap h-8 text-xs bg-black/20"
                      >
                        {opt.label}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

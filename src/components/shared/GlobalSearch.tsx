'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, FileText, Scale, HeartPulse, DollarSign, Loader2 } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useRouter } from 'next/navigation';
import type { SearchResult } from '@/app/api/search/route';

const moduleIcons = {
  tenders: <FileText className="w-4 h-4 text-blue-400" />,
  compliance: <Scale className="w-4 h-4 text-purple-400" />,
  health: <HeartPulse className="w-4 h-4 text-rose-400" />,
  salaries: <DollarSign className="w-4 h-4 text-emerald-400" />,
};

const moduleLabels = {
  tenders: 'Procurement',
  compliance: 'Compliance',
  health: 'Health Intel',
  salaries: 'Salaries',
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Ctrl+K or Cmd+K to open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const grouped = results.reduce((acc, r) => {
    if (!acc[r.module]) acc[r.module] = [];
    acc[r.module].push(r);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      <button
        id="global-search-trigger"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center md:justify-start gap-2 w-9 h-9 md:w-auto md:h-auto md:px-3 md:py-1.5 rounded-full md:rounded-lg bg-white/5 border border-white/10 text-sm text-white/50 hover:text-white hover:bg-white/10 transition-all"
      >
        <Search className="w-4 h-4 md:w-3.5 md:h-3.5" />
        <span className="hidden md:inline">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-white/10 text-white/40">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search tenders, compliance, health, salaries..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Searching...
            </div>
          )}
          {!isLoading && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>No results found for &quot;{query}&quot;</CommandEmpty>
          )}
          {!isLoading && query.length < 2 && (
            <CommandEmpty>Type at least 2 characters to search...</CommandEmpty>
          )}
          {Object.entries(grouped).map(([module, items]) => (
            <CommandGroup key={module} heading={moduleLabels[module as keyof typeof moduleLabels]}>
              {items.map(item => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => {
                    router.push(item.url);
                    setOpen(false);
                  }}
                  className="flex items-start gap-3"
                >
                  {moduleIcons[item.module]}
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{item.title}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground truncate">{item.description}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

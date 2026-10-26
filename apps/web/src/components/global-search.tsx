import { useEffect, useRef, useState } from 'react';
import type { SearchResult } from '@carebridge/shared';
import { Building2, Loader2, Pill, Search, Stethoscope, Tag, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useGlobalSearch } from '@/hooks/use-search';

const GROUP_LABELS: Record<string, string> = {
  doctors: 'Doctors',
  specialties: 'Specialties',
  medicines: 'Medicines',
  clinics: 'Clinics',
  hospitals: 'Hospitals',
  pharmacies: 'Pharmacies',
};

function resultIcon(type: SearchResult['type']) {
  switch (type) {
    case 'doctor':
      return Stethoscope;
    case 'specialty':
      return Tag;
    case 'medicine':
      return Pill;
    default:
      return Building2;
  }
}

export function GlobalSearch({ className, autoFocus = false, onNavigate }: { className?: string; autoFocus?: boolean; onNavigate?: () => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(query, 250);
  const { data, isFetching, isError, refetch } = useGlobalSearch(debounced);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const groups = data ? Object.entries(data.groups).filter(([, items]) => items.length > 0) : [];

  function go(href: string) {
    setOpen(false);
    setQuery('');
    navigate(href);
    onNavigate?.();
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Search medicines, doctors, clinics or healthcare services"
          className="h-12 w-full rounded-2xl border border-input bg-white pl-11 pr-10 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground interactive-pill"
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </button>
        )}
      </div>

      {open && debounced.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-white p-2 shadow-xl">
          {isError && !isFetching ? (
            <div role="alert" className="px-4 py-6 text-center text-sm text-muted-foreground">
              <p>Search is unavailable right now.</p>
              <button type="button" onClick={() => refetch()} className="mt-2 font-medium text-primary hover:underline">
                Try again
              </button>
            </div>
          ) : groups.length === 0 && !isFetching && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No results for "{debounced}". Try a doctor, medicine, clinic or specialty.</p>
          )}
          {groups.map(([groupKey, items]) => (
            <div key={groupKey} className="mb-1">
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{GROUP_LABELS[groupKey] ?? groupKey}</p>
              {items.map((item) => {
                const Icon = resultIcon(item.type);
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => go(item.href)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left interactive-row"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
                    </span>
                    {item.badge && <span className="shrink-0 text-xs font-semibold text-amber-600">{item.badge}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

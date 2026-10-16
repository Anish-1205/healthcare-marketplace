import { useMemo } from 'react';
import type { ConsultationType } from '@carebridge/shared';
import { SlidersHorizontal, Stethoscope, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { DoctorCard } from '@/components/doctor-card';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoctors } from '@/hooks/use-doctors';
import { useSpecialties } from '@/hooks/use-reference';

const FEE_OPTIONS = [
  { label: 'Any fee', value: '' },
  { label: 'Up to ₹500', value: '500' },
  { label: 'Up to ₹800', value: '800' },
  { label: 'Up to ₹1200', value: '1200' },
];

const TYPE_OPTIONS: { label: string; value: '' | ConsultationType }[] = [
  { label: 'Any consultation', value: '' },
  { label: 'In person', value: 'IN_PERSON' },
  { label: 'Video', value: 'VIDEO' },
  { label: 'Phone', value: 'PHONE' },
];

function parseConsultationType(value: string | null): ConsultationType | '' {
  return TYPE_OPTIONS.find((opt) => opt.value && opt.value === value)?.value ?? '';
}

const RATING_OPTIONS = [
  { label: 'Any rating', value: '' },
  { label: '4+ stars', value: '4' },
  { label: '4.5+ stars', value: '4.5' },
];

const SORT_OPTIONS = [
  { label: 'Top rated', value: '-rating' },
  { label: 'Lowest fee', value: 'fee' },
  { label: 'Most experienced', value: '-experience' },
  { label: 'Name (A-Z)', value: 'name' },
];

export function DoctorsPage() {
  const [params, setParams] = useSearchParams();
  const specialties = useSpecialties();

  const page = Number(params.get('page') ?? '1');
  const specialty = params.get('specialty') ?? '';
  const feeMax = params.get('feeMax') ?? '';
  const minRating = params.get('minRating') ?? '';
  const sort = params.get('sort') ?? '-rating';
  const q = params.get('q') ?? '';
  const type = parseConsultationType(params.get('type'));

  const query = useMemo(
    () => ({
      page,
      pageSize: 12,
      q: q || undefined,
      specialty: specialty || undefined,
      feeMax: feeMax ? Number(feeMax) : undefined,
      minRating: minRating ? Number(minRating) : undefined,
      type: type ? [type] : undefined,
      sort,
    }),
    [page, q, specialty, feeMax, minRating, type, sort],
  );
  const { data, isLoading, isError, refetch, isPlaceholderData } = useDoctors(query);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }

  const activeSpecialty = specialties.data?.find((s) => s.slug === specialty);
  const hasFilters = specialty || feeMax || minRating || q || type;

  return (
    <div className="container py-8">
      <PageHeader
        title={activeSpecialty ? `${activeSpecialty.name}s Near You` : type === 'VIDEO' ? 'Video Consultations' : 'Find the Right Doctor'}
        subtitle="Book online or in-person consultations with verified doctors."
        resultCount={data?.meta.total}
      />

      {q && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm text-accent-foreground">
          <span>
            Showing results for <strong>"{q}"</strong>
          </span>
          <button onClick={() => update('q', '')} className="ml-auto rounded-full p-1 hover:bg-white/40" aria-label="Clear search">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Select value={specialty} onChange={(e) => update('specialty', e.target.value)} className="w-auto min-w-[160px]">
          <option value="">All Specialties</option>
          {specialties.data?.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select value={feeMax} onChange={(e) => update('feeMax', e.target.value)} className="w-auto min-w-[140px]">
          {FEE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select value={type} onChange={(e) => update('type', e.target.value)} className="w-auto min-w-[160px]" aria-label="Consultation type">
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select value={minRating} onChange={(e) => update('minRating', e.target.value)} className="w-auto min-w-[140px]">
          {RATING_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => update('sort', e.target.value)} className="ml-auto w-auto min-w-[160px]">
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => setParams({})}>
            Clear all
          </Button>
        )}
      </div>

      {isLoading && !isPlaceholderData ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data?.data.length ? (
        <EmptyState icon={Stethoscope} title="No doctors match your filters" description="Try adjusting or clearing your filters." action={<Button onClick={() => setParams({})}>Clear filters</Button>} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(p) => update('page', String(p))} />
        </>
      )}
    </div>
  );
}

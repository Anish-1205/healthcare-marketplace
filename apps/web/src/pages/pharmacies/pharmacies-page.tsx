import { useMemo } from 'react';
import { Store } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { OrganizationCard } from '@/components/organization-card';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePharmacies } from '@/hooks/use-pharmacies';

const LOCALITIES = ['Central District', 'Lake View', 'Green Hills', 'City Centre', 'North Avenue', 'Tech Park', 'Riverside'];

export function PharmaciesPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1');
  const locality = params.get('locality') ?? '';

  const query = useMemo(() => ({ page, pageSize: 12, locality: locality || undefined }), [page, locality]);
  const { data, isLoading, isError, refetch, isPlaceholderData } = usePharmacies(query);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next);
  }

  return (
    <div className="container py-8">
      <PageHeader title="Choose Your Pharmacy" subtitle="Compare delivery time, ratings and prescription support." resultCount={data?.meta.total} />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <Select value={locality} onChange={(e) => update('locality', e.target.value)} className="w-auto min-w-[160px]">
          <option value="">All Localities</option>
          {LOCALITIES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
        {locality && (
          <Button variant="ghost" size="sm" onClick={() => setParams({})} className="ml-auto">
            Clear all
          </Button>
        )}
      </div>

      {isLoading && !isPlaceholderData ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data?.data.length ? (
        <EmptyState icon={Store} title="No pharmacies found" description="Try a different locality." action={<Button onClick={() => setParams({})}>Clear filters</Button>} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((pharmacy) => (
              <OrganizationCard key={pharmacy.id} organization={pharmacy} />
            ))}
          </div>
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(p) => update('page', String(p))} />
        </>
      )}
    </div>
  );
}

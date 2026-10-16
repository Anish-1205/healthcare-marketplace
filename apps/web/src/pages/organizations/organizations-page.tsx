import { useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { OrganizationCard } from '@/components/organization-card';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganizations } from '@/hooks/use-organizations';
import { useSpecialties } from '@/hooks/use-reference';

const LOCALITIES = ['Central District', 'Lake View', 'Green Hills', 'City Centre', 'North Avenue', 'Tech Park', 'Riverside'];

export function OrganizationsPage() {
  const [params, setParams] = useSearchParams();
  const specialties = useSpecialties();
  const page = Number(params.get('page') ?? '1');
  const type = params.get('type') ?? '';
  const locality = params.get('locality') ?? '';
  const specialty = params.get('specialty') ?? '';

  const query = useMemo(
    () => ({
      page,
      pageSize: 12,
      type: type ? ([type] as ('CLINIC' | 'HOSPITAL')[]) : (['CLINIC', 'HOSPITAL'] as ('CLINIC' | 'HOSPITAL')[]),
      locality: locality || undefined,
      specialty: specialty || undefined,
    }),
    [page, type, locality, specialty],
  );
  const { data, isLoading, isError, refetch, isPlaceholderData } = useOrganizations(query);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }

  return (
    <div className="container py-8">
      <PageHeader title="Clinics & Hospitals" subtitle="Find trusted healthcare organizations near you." resultCount={data?.meta.total} />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <Select value={type} onChange={(e) => update('type', e.target.value)} className="w-auto min-w-[150px]">
          <option value="">Clinics & Hospitals</option>
          <option value="CLINIC">Clinics Only</option>
          <option value="HOSPITAL">Hospitals Only</option>
        </Select>
        <Select value={locality} onChange={(e) => update('locality', e.target.value)} className="w-auto min-w-[150px]">
          <option value="">All Localities</option>
          {LOCALITIES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
        <Select value={specialty} onChange={(e) => update('specialty', e.target.value)} className="w-auto min-w-[160px]">
          <option value="">All Specialties</option>
          {specialties.data?.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </Select>
        {(type || locality || specialty) && (
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
        <EmptyState icon={Building2} title="No organizations found" description="Try a different locality or specialty." action={<Button onClick={() => setParams({})}>Clear filters</Button>} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((org) => (
              <OrganizationCard key={org.id} organization={org} />
            ))}
          </div>
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(p) => update('page', String(p))} />
        </>
      )}
    </div>
  );
}

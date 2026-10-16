import { useMemo } from 'react';
import { Pill, Store, X } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { MedicineCard } from '@/components/medicine-card';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useMedicines } from '@/hooks/use-medicines';
import { useMedicineCategories } from '@/hooks/use-reference';
import { usePharmacy } from '@/hooks/use-pharmacies';

const SORT_OPTIONS = [
  { label: 'Name (A-Z)', value: 'name' },
  { label: 'Price: Low to High', value: 'mrp' },
  { label: 'Price: High to Low', value: '-mrp' },
];

export function MedicinesPage() {
  const { slug: categorySlug } = useParams<{ slug?: string }>();
  const [params, setParams] = useSearchParams();
  const categories = useMedicineCategories();

  const page = Number(params.get('page') ?? '1');
  const q = params.get('q') ?? '';
  const category = categorySlug ?? params.get('category') ?? '';
  const requiresPrescription = params.get('rx') ?? '';
  const pharmacyId = params.get('pharmacyId') ?? '';
  const sort = params.get('sort') ?? 'name';

  const pharmacy = usePharmacy(pharmacyId || undefined);

  const query = useMemo(
    () => ({
      page,
      pageSize: 15,
      q: q || undefined,
      category: category || undefined,
      requiresPrescription: requiresPrescription ? requiresPrescription === 'true' : undefined,
      pharmacyId: pharmacyId || undefined,
      sort,
    }),
    [page, q, category, requiresPrescription, pharmacyId, sort],
  );
  const { data, isLoading, isError, refetch, isPlaceholderData } = useMedicines(query);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }

  const activeCategory = categories.data?.find((c) => c.slug === category);

  return (
    <div className="container py-8">
      <PageHeader title={activeCategory ? activeCategory.name : 'Buy Medicines'} subtitle="Compare prices and order from your preferred pharmacy." resultCount={data?.meta.total} />

      {pharmacy.data && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm text-accent-foreground">
          <Store className="h-4 w-4 shrink-0" />
          <span>
            Shopping from <strong>{pharmacy.data.name}</strong>
          </span>
          <button
            onClick={() => update('pharmacyId', '')}
            className="ml-auto flex items-center gap-1 rounded-full p-1 hover:bg-white/40"
            aria-label="Stop shopping from this pharmacy"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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
        {!categorySlug && (
          <Select value={category} onChange={(e) => update('category', e.target.value)} className="w-auto min-w-[170px]">
            <option value="">All Categories</option>
            {categories.data?.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
        <Select value={requiresPrescription} onChange={(e) => update('rx', e.target.value)} className="w-auto min-w-[170px]">
          <option value="">All Medicines</option>
          <option value="false">No Prescription Needed</option>
          <option value="true">Prescription Required</option>
        </Select>
        <Select value={sort} onChange={(e) => update('sort', e.target.value)} className="ml-auto w-auto min-w-[170px]">
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && !isPlaceholderData ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data?.data.length ? (
        <EmptyState
          icon={Pill}
          title="No medicines found"
          description="Try a different category or search term."
          action={
            <Link to="/medicines" className="text-sm font-semibold text-primary hover:underline">
              Browse all medicines
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {data.data.map((medicine) => (
              <MedicineCard key={medicine.id} medicine={medicine} pharmacyId={pharmacyId || undefined} />
            ))}
          </div>
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(p) => update('page', String(p))} />
        </>
      )}
    </div>
  );
}

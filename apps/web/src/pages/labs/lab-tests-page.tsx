import { useState } from 'react';
import { Clock3, FlaskConical, Search, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useLabCategories, useLabTests } from '@/hooks/use-labs';
import { formatCurrency } from '@/lib/utils';

export function LabTestsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [packages, setPackages] = useState(false);
  const search = useDebouncedValue(q, 250);
  const query = useLabTests({ page, pageSize: 12, q: search || undefined, category: category || undefined, package: packages || undefined });
  const categories = useLabCategories();
  return (
    <div className="container py-8">
      <PageHeader title="Lab Tests" subtitle="Book demo diagnostic tests and health packages with home collection." resultCount={query.data?.meta.total} action={<Link to="/lab-bookings" className={buttonVariants({ variant: 'outline' })}>My bookings</Link>} />
      <div className="mb-6 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder="Search CBC, thyroid, diabetes…" /></div>
          <select className="rounded-lg border bg-background px-3 py-2 text-sm" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}><option value="">All categories</option>{categories.data?.map((value) => <option key={value}>{value}</option>)}</select>
          <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><input type="checkbox" checked={packages} onChange={(event) => { setPackages(event.target.checked); setPage(1); }} />Packages only</label>
        </div>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-accent p-4 text-sm"><FlaskConical className="mb-2 h-5 w-5 text-primary" /><strong>17 demo tests</strong><p className="text-muted-foreground">Popular tests and preventive packages.</p></div>
        <div className="rounded-xl bg-accent p-4 text-sm"><ShieldCheck className="mb-2 h-5 w-5 text-primary" /><strong>Home collection</strong><p className="text-muted-foreground">Choose a saved address and time slot.</p></div>
        <div className="rounded-xl bg-accent p-4 text-sm"><Clock3 className="mb-2 h-5 w-5 text-primary" /><strong>Digital reports</strong><p className="text-muted-foreground">Demo reports appear in Health Records.</p></div>
      </div>
      {query.isLoading ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-64" />)}</div> : query.isError ? <ErrorState message="We couldn't load lab tests." onRetry={() => query.refetch()} /> : !query.data?.data.length ? <EmptyState icon={FlaskConical} title="No matching tests" description="Try another search or category." /> : <><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{query.data.data.map((test) => <article key={test.id} className="flex flex-col rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-2"><Badge variant={test.isPackage ? 'accent' : 'muted'}>{test.isPackage ? 'Health package' : test.category}</Badge>{test.isPopular && <Badge variant="success">Popular</Badge>}</div><h2 className="mt-4 text-lg font-semibold">{test.name}</h2><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{test.description}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground"><span>{test.parametersCount} parameters</span><span>{test.sampleType}</span><span>{test.fastingRequired ? 'Fasting required' : 'No fasting'}</span><span>Report in {test.turnaroundHours}h</span></div><div className="mt-auto flex items-end justify-between pt-5"><div><span className="text-xs text-muted-foreground line-through">{formatCurrency(test.mrp)}</span><p className="text-xl font-bold text-primary">{formatCurrency(test.price)}</p></div><Link to={`/lab-tests/${test.slug}`} className={buttonVariants({ size: 'sm' })}>View & book</Link></div></article>)}</div><Pagination page={query.data.meta.page} totalPages={query.data.meta.totalPages} onChange={setPage} /></>}
      <p className="mt-8 rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">Demo diagnostic catalogue and booking only. No samples are collected and no clinical results are generated.</p>
    </div>
  );
}

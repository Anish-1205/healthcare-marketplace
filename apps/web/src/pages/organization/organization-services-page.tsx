import { useState } from 'react';
import { BriefcaseMedical, Plus } from 'lucide-react';
import { ApiError } from '@/api/client';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateOrganizationService, useOrganizationServices, useUpdateOrganizationService } from '@/hooks/use-organization-portal';
import { formatCurrency } from '@/lib/utils';

export function OrganizationServicesPage() {
  const query = useOrganizationServices(); const create = useCreateOrganizationService(); const update = useUpdateOrganizationService(); const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: '', durationMinutes: '' }); const [error, setError] = useState<string | null>(null);
  async function submit() { setError(null); try { await create.mutateAsync({ name: form.name, description: form.description || null, price: form.price ? Number(form.price) : null, durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null }); setForm({ name: '', description: '', price: '', durationMinutes: '' }); setOpen(false); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Could not add service.'); } }
  return <div><PageHeader title="Services" subtitle="Define the care services patients can find at your organization." resultCount={query.data?.length} action={<Button onClick={() => setOpen((value) => !value)}><Plus className="h-4 w-4" /> Add service</Button>} />
    {open && <div className="mb-6 rounded-2xl border bg-card p-5 shadow-sm"><div className="grid gap-3 sm:grid-cols-2"><div><Label>Service name</Label><Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Physiotherapy" /></div><div><Label>Price</Label><Input className="mt-1" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div><div><Label>Description</Label><Input className="mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div><div><Label>Duration (minutes)</Label><Input className="mt-1" type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} /></div></div>{error && <p className="mt-3 text-sm text-destructive">{error}</p>}<div className="mt-4 flex gap-2"><Button disabled={!form.name || create.isPending} onClick={submit}>Add service</Button><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div></div>}
    {query.isLoading ? <Skeleton className="h-72" /> : query.isError ? <ErrorState message="We couldn't load services." onRetry={() => query.refetch()} /> : !query.data?.length ? <EmptyState icon={BriefcaseMedical} title="No services yet" description="Add consultations and care services offered here." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{query.data.map((service) => <div key={service.id} className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{service.name}</p>{service.specialtyName && <p className="text-xs text-muted-foreground">{service.specialtyName}</p>}</div><Badge variant={service.isActive ? 'success' : 'muted'}>{service.isActive ? 'Active' : 'Hidden'}</Badge></div><p className="mt-3 min-h-10 text-sm text-muted-foreground">{service.description || 'No description provided.'}</p><div className="mt-4 flex items-center justify-between"><span className="font-semibold text-primary">{service.price === null ? 'Price on request' : formatCurrency(service.price)}</span><span className="text-xs text-muted-foreground">{service.durationMinutes ? `${service.durationMinutes} min` : ''}</span></div><Button className="mt-4" size="sm" variant="outline" onClick={() => update.mutate({ id: service.id, payload: { name: service.name, description: service.description, price: service.price, durationMinutes: service.durationMinutes, specialtyId: service.specialtyId, isActive: !service.isActive } })}>{service.isActive ? 'Hide service' : 'Activate service'}</Button></div>)}</div>}
  </div>;
}

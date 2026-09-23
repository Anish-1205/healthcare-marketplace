import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { ApiError } from '@/api/client';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateOrganizationStaff, useOrganizationStaff, useUpdateOrganizationStaff } from '@/hooks/use-organization-portal';

export function OrganizationStaffPage() {
  const query = useOrganizationStaff(); const create = useCreateOrganizationStaff(); const update = useUpdateOrganizationStaff();
  const [open, setOpen] = useState(false); const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', title: '', staffRole: 'STAFF' as 'ADMIN' | 'STAFF' }); const [error, setError] = useState<string | null>(null);
  async function submit() { setError(null); try { await create.mutateAsync({ ...form, phone: form.phone || null, title: form.title || null }); setOpen(false); setForm({ firstName: '', lastName: '', email: '', phone: '', title: '', staffRole: 'STAFF' }); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Could not add staff.'); } }
  return <div><PageHeader title="Staff" subtitle="Manage administrators, receptionists, and support staff." resultCount={query.data?.length} action={<Button onClick={() => setOpen((value) => !value)}><Plus className="h-4 w-4" /> Add staff</Button>} />
    {open && <div className="mb-6 rounded-2xl border bg-card p-5 shadow-sm"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div><Label>First name</Label><Input className="mt-1" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div><div><Label>Last name</Label><Input className="mt-1" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div><div><Label>Email</Label><Input className="mt-1" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div><div><Label>Phone</Label><Input className="mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div><div><Label>Title</Label><Input className="mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Receptionist" /></div><div><Label>Access</Label><Select className="mt-1" value={form.staffRole} onChange={(e) => setForm({ ...form, staffRole: e.target.value as 'ADMIN' | 'STAFF' })}><option value="STAFF">Staff</option><option value="ADMIN">Administrator</option></Select></div></div><p className="mt-3 text-xs text-muted-foreground">New demo accounts use the shared demo password. Existing CareBridge users keep their current password.</p>{error && <p className="mt-2 text-sm text-destructive">{error}</p>}<div className="mt-4 flex gap-2"><Button disabled={!form.firstName || !form.lastName || !form.email || create.isPending} onClick={submit}>Add staff member</Button><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div></div>}
    {query.isLoading ? <Skeleton className="h-72" /> : query.isError ? <ErrorState message="We couldn't load staff." onRetry={() => query.refetch()} /> : !query.data?.length ? <EmptyState icon={Users} title="No staff members" /> : <div className="overflow-hidden rounded-2xl border bg-card shadow-sm"><div className="divide-y">{query.data.map((member) => <div key={member.membershipId} className="flex flex-wrap items-center gap-4 p-4"><Avatar firstName={member.name.split(' ')[0]} lastName={member.name.split(' ').slice(1).join(' ')} imageUrl={member.avatarUrl} /><div className="min-w-[12rem] flex-1"><p className="font-semibold">{member.name}</p><p className="text-xs text-muted-foreground">{member.email}{member.phone ? ` · ${member.phone}` : ''}</p></div><div><p className="text-sm font-medium">{member.title || 'Staff member'}</p><Badge variant={member.staffRole === 'ADMIN' ? 'accent' : 'muted'}>{member.staffRole === 'ADMIN' ? 'Administrator' : 'Staff'}</Badge></div><Button size="sm" variant="outline" onClick={() => update.mutate({ id: member.membershipId, payload: { isActive: !member.isActive } })}>{member.isActive ? 'Deactivate' : 'Activate'}</Button></div>)}</div></div>}
  </div>;
}

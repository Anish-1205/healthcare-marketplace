import { useState } from 'react';
import { Plus, Stethoscope } from 'lucide-react';
import { ApiError } from '@/api/client';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssociateOrganizationDoctor, useOrganizationDoctors, useUpdateOrganizationDoctor } from '@/hooks/use-organization-portal';
import { useHasPermission } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/utils';

export function OrganizationDoctorsPage() {
  const query = useOrganizationDoctors(); const add = useAssociateOrganizationDoctor(); const update = useUpdateOrganizationDoctor();
  const canManage = useHasPermission('organization.doctor.manage');
  const [showForm, setShowForm] = useState(false); const [email, setEmail] = useState(''); const [title, setTitle] = useState(''); const [fee, setFee] = useState(''); const [error, setError] = useState<string | null>(null);
  async function submit() { setError(null); try { await add.mutateAsync({ email, title: title || null, consultationFee: fee ? Number(fee) : null }); setEmail(''); setTitle(''); setFee(''); setShowForm(false); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Could not associate this doctor.'); } }
  return <div><PageHeader title="Doctors" subtitle="Associate doctors, set clinic fees, and control active listings." resultCount={query.data?.length} action={canManage ? <Button onClick={() => setShowForm((value) => !value)}><Plus className="h-4 w-4" /> Add doctor</Button> : undefined} />
    {showForm && <div className="mb-6 rounded-2xl border bg-card p-5 shadow-sm"><h2 className="font-semibold">Associate an existing CareBridge doctor</h2><p className="mt-1 text-sm text-muted-foreground">Enter the email used by the doctor’s account.</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><div><Label>Email</Label><Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctor@carebridge.demo" /></div><div><Label>Role / title</Label><Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Consultant Dermatologist" /></div><div><Label>Consultation fee</Label><Input className="mt-1" type="number" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="800" /></div></div>{error && <p className="mt-3 text-sm text-destructive">{error}</p>}<div className="mt-4 flex gap-2"><Button disabled={!email || add.isPending} onClick={submit}>{add.isPending ? 'Adding…' : 'Associate doctor'}</Button><Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button></div></div>}
    {query.isLoading ? <Skeleton className="h-72" /> : query.isError ? <ErrorState message="We couldn't load doctors." onRetry={() => query.refetch()} /> : !query.data?.length ? <EmptyState icon={Stethoscope} title="No doctors associated" /> : <div className="grid gap-4 lg:grid-cols-2">{query.data.map((doctor) => <div key={doctor.doctorId} className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex gap-3"><Avatar firstName={doctor.name.replace('Dr. ', '').split(' ')[0]} lastName={doctor.name.split(' ').slice(2).join(' ')} imageUrl={doctor.avatarUrl} size="lg" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{doctor.name}</p><Badge variant={doctor.isActive ? 'success' : 'muted'}>{doctor.isActive ? 'Active' : 'Inactive'}</Badge>{doctor.approvalStatus !== 'APPROVED' && <Badge variant="warning">{doctor.approvalStatus.replace('_', ' ')}</Badge>}</div><p className="text-sm text-muted-foreground">{doctor.title || doctor.specialties.join(', ') || 'Doctor'} · {doctor.qualifications}</p><p className="mt-1 text-sm font-semibold text-primary">{formatCurrency(doctor.consultationFee)}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => update.mutate({ id: doctor.doctorId, payload: { isActive: !doctor.isActive } })}>{doctor.isActive ? 'Deactivate' : 'Activate'}</Button><Button size="sm" variant="ghost" onClick={() => { const value = window.prompt('Clinic consultation fee', String(doctor.consultationFee)); if (value !== null && !Number.isNaN(Number(value))) update.mutate({ id: doctor.doctorId, payload: { consultationFee: Number(value) } }); }}>Edit fee</Button></div></div>)}</div>}
  </div>;
}

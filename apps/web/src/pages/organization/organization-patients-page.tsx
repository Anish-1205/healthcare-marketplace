import { useState } from 'react';
import { Search, UserRound } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganizationPatients } from '@/hooks/use-organization-portal';
import { formatSlotLabel } from '@/lib/utils';

export function OrganizationPatientsPage() {
  const query = useOrganizationPatients(); const [search, setSearch] = useState('');
  const rows = (query.data ?? []).filter((patient) => patient.name.toLowerCase().includes(search.toLowerCase()) || patient.phone?.includes(search));
  return <div><PageHeader title="Patients" subtitle="People who have interacted with your organization." resultCount={query.data?.length} />
    <div className="relative mb-5 max-w-md"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search by patient or phone" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
    {query.isLoading ? <Skeleton className="h-72" /> : query.isError ? <ErrorState message="We couldn't load patients." onRetry={() => query.refetch()} /> : !rows.length ? <EmptyState icon={UserRound} title="No patients found" /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((patient) => <div key={patient.patientId} className="rounded-2xl border bg-card p-4 shadow-sm"><div className="flex items-center gap-3"><Avatar firstName={patient.name.split(' ')[0]} lastName={patient.name.split(' ').slice(1).join(' ')} imageUrl={patient.avatarUrl} /><div><p className="font-semibold">{patient.name}</p><p className="text-xs text-muted-foreground">{[patient.age === null ? null : `${patient.age} yrs`, patient.gender?.toLowerCase(), patient.phone].filter(Boolean).join(' · ')}</p></div></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/60 p-3 text-sm"><div><p className="text-xs text-muted-foreground">Visits</p><p className="font-semibold">{patient.totalVisits}</p></div><div><p className="text-xs text-muted-foreground">Last / next visit</p><p className="text-xs font-medium">{patient.nextAppointmentAt ? `Next: ${formatSlotLabel(patient.nextAppointmentAt)}` : patient.lastVisitAt ? formatSlotLabel(patient.lastVisitAt) : '—'}</p></div></div></div>)}</div>}
  </div>;
}

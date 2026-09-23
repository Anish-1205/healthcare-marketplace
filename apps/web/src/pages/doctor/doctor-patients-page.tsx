import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useDoctorPatients } from '@/hooks/use-doctor-portal';
import { formatSlotLabel } from '@/lib/utils';

export function DoctorPatientsPage() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'name'>('recent');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search, 300);

  const { data, isLoading, isError, refetch } = useDoctorPatients({ q: q || undefined, sort, page, pageSize: 12 });

  return (
    <div>
      <PageHeader title="Patients" subtitle="Everyone you've treated or have an upcoming visit with." resultCount={data?.meta.total} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[14rem]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search patients by name"
            className="pl-10"
          />
        </div>
        <Select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as 'recent' | 'name');
            setPage(1);
          }}
          className="w-auto min-w-[10rem]"
        >
          <option value="recent">Most recent visit</option>
          <option value="name">Name (A–Z)</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="We couldn't load your patients." onRetry={() => refetch()} />
      ) : !data?.data.length ? (
        <EmptyState icon={Users} title="No patients found" description={search ? 'Try a different search.' : 'Patients you see will show up here.'} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((patient) => (
              <Link key={patient.patientId} to={`/doctor/patients/${patient.patientId}`} className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md">
                <div className="flex items-center gap-3">
                  <Avatar firstName={patient.name.split(' ')[0]} lastName={patient.name.split(' ').slice(1).join(' ')} imageUrl={patient.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {patient.age !== null ? `${patient.age} yrs` : ''}
                      {patient.age !== null && patient.gender ? ' · ' : ''}
                      {patient.gender ? patient.gender.charAt(0) + patient.gender.slice(1).toLowerCase() : ''}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {patient.totalVisits} visit{patient.totalVisits === 1 ? '' : 's'}
                  </span>
                  <span>{patient.lastVisitAt ? formatSlotLabel(patient.lastVisitAt) : patient.nextAppointmentAt ? `Upcoming: ${formatSlotLabel(patient.nextAppointmentAt)}` : ''}</span>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import type { AppointmentScope, AppointmentStatus } from '@carebridge/shared';
import { CalendarClock } from 'lucide-react';
import { DoctorAppointmentRow } from '@/components/doctor/doctor-appointment-row';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppointments } from '@/hooks/use-appointments';
import { APPOINTMENT_STATUS_LABELS } from '@/lib/appointment-labels';
import { cn } from '@/lib/utils';

const TABS: Array<{ value: AppointmentScope; label: string }> = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
];

export function DoctorAppointmentsPage() {
  const [scope, setScope] = useState<AppointmentScope>('upcoming');
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useAppointments({
    scope,
    status: status ? [status] : undefined,
    page,
    pageSize: 15,
    sort: scope === 'upcoming' ? 'scheduledStart' : '-scheduledStart',
  });

  return (
    <div>
      <PageHeader title="Appointments" subtitle="Your full schedule, past and upcoming." resultCount={data?.meta.total} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setScope(tab.value);
                setPage(1);
              }}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
                scope === tab.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground interactive-row',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as AppointmentStatus | '');
            setPage(1);
          }}
          className="w-auto min-w-[10rem]"
        >
          <option value="">All statuses</option>
          {(Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[]).map((value) => (
            <option key={value} value={value}>
              {APPOINTMENT_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="We couldn't load your appointments." onRetry={() => refetch()} />
      ) : !data?.data.length ? (
        <EmptyState icon={CalendarClock} title="No appointments here" description="Try a different tab or filter." />
      ) : (
        <>
          <div className="space-y-3">
            {data.data.map((appointment) => (
              <DoctorAppointmentRow key={appointment.id} appointment={appointment} />
            ))}
          </div>
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

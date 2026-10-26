import { useState } from 'react';
import type { AppointmentScope } from '@carebridge/shared';
import { CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppointmentCard } from '@/components/appointment-card';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppointments } from '@/hooks/use-appointments';
import { cn } from '@/lib/utils';

const TABS: Array<{ value: AppointmentScope; label: string }> = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
];

export function AppointmentsPage() {
  const [scope, setScope] = useState<AppointmentScope>('upcoming');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useAppointments({
    scope,
    page,
    pageSize: 10,
    sort: scope === 'upcoming' ? 'scheduledStart' : '-scheduledStart',
  });

  return (
    <div className="container py-8">
      <PageHeader title="My Appointments" subtitle="Your consultations, past and upcoming." />

      <div className="mb-6 flex gap-2">
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

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-44 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="We couldn't load your appointments." onRetry={() => refetch()} />
      ) : !data?.data.length ? (
        <EmptyState
          icon={CalendarClock}
          title={scope === 'upcoming' ? 'No upcoming appointments' : 'Nothing here yet'}
          description={scope === 'upcoming' ? 'Book a consultation and it will show up here.' : 'Your past consultations will appear here.'}
          action={
            <Link to="/doctors" className={buttonVariants({})}>
              Find a doctor
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-4">
            {data.data.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import type { ConsultationScope } from '@carebridge/shared';
import { Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useConsultations } from '@/hooks/use-consultations';
import { cn, formatSlotLabel } from '@/lib/utils';

const TABS: Array<{ value: ConsultationScope; label: string }> = [
  { value: 'active', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'all', label: 'All' },
];

export function DoctorConsultationsPage() {
  const [scope, setScope] = useState<ConsultationScope>('all');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useConsultations({ scope, page, pageSize: 12 });

  return (
    <div>
      <PageHeader title="Consultations" subtitle="Visits you've started, with their notes and prescriptions." resultCount={data?.meta.total} />

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
              scope === tab.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="We couldn't load your consultations." onRetry={() => refetch()} />
      ) : !data?.data.length ? (
        <EmptyState
          icon={Stethoscope}
          title="No consultations here"
          description="Start one from an appointment when the patient arrives."
        />
      ) : (
        <>
          <div className="space-y-3">
            {data.data.map((consultation) => (
              <Link
                key={consultation.id}
                to={`/doctor/consultations/${consultation.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    firstName={consultation.patient.name.split(' ')[0]}
                    lastName={consultation.patient.name.split(' ').slice(1).join(' ')}
                    imageUrl={consultation.patient.avatarUrl}
                  />
                  <div>
                    <p className="font-semibold text-foreground">{consultation.patient.name}</p>
                    <p className="text-sm text-muted-foreground">{consultation.diagnosis ?? consultation.chiefComplaint ?? 'No notes yet'}</p>
                    <p className="text-xs text-muted-foreground">{formatSlotLabel(consultation.scheduledStart)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {consultation.prescriptionId && <Badge variant="accent">Prescription</Badge>}
                  <Badge variant={consultation.status === 'COMPLETED' ? 'muted' : 'default'}>
                    {consultation.status === 'COMPLETED' ? 'Completed' : 'In progress'}
                  </Badge>
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

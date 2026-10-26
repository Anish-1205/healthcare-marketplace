import { useState } from 'react';
import type { PrescriptionStatus } from '@carebridge/shared';
import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrescriptions } from '@/hooks/use-prescriptions';
import { cn } from '@/lib/utils';

const TABS: Array<{ value: PrescriptionStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'ISSUED', label: 'Issued' },
];

export function DoctorPrescriptionsPage() {
  const [status, setStatus] = useState<PrescriptionStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = usePrescriptions({ status: status === 'ALL' ? undefined : [status], page, pageSize: 12 });

  return (
    <div>
      <PageHeader title="Prescriptions" subtitle="Everything you've written, drafts included." resultCount={data?.meta.total} />

      <div className="mb-6 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
              status === tab.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground interactive-row',
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
        <ErrorState message="We couldn't load your prescriptions." onRetry={() => refetch()} />
      ) : !data?.data.length ? (
        <EmptyState icon={ClipboardList} title="Nothing here yet" description="Prescriptions you write during consultations appear here." />
      ) : (
        <>
          <div className="space-y-3">
            {data.data.map((prescription) => (
              <Link
                key={prescription.id}
                to={`/doctor/prescriptions/${prescription.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft interactive-card"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    firstName={prescription.patient.name.split(' ')[0]}
                    lastName={prescription.patient.name.split(' ').slice(1).join(' ')}
                    imageUrl={prescription.patient.avatarUrl}
                  />
                  <div>
                    <p className="font-semibold text-foreground">{prescription.patient.name}</p>
                    <p className="text-sm text-muted-foreground">{prescription.diagnosis ?? 'No diagnosis recorded'}</p>
                    <p className="font-mono text-xs text-muted-foreground">{prescription.prescriptionNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {prescription.itemCount} medicine{prescription.itemCount === 1 ? '' : 's'}
                  </span>
                  <Badge variant={prescription.status === 'ISSUED' ? 'success' : prescription.status === 'DRAFT' ? 'warning' : 'destructive'}>
                    {prescription.status === 'ISSUED' ? 'Issued' : prescription.status === 'DRAFT' ? 'Draft' : 'Cancelled'}
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

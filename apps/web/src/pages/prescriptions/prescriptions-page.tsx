import { useState } from 'react';
import { ClipboardList, Pill } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrescriptions } from '@/hooks/use-prescriptions';

export function PrescriptionsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = usePrescriptions({ page, pageSize: 10 });

  return (
    <div className="container py-8">
      <PageHeader title="My Prescriptions" subtitle="Prescriptions your doctors have issued to you." resultCount={data?.meta.total} />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="We couldn't load your prescriptions." onRetry={() => refetch()} />
      ) : !data?.data.length ? (
        <EmptyState
          icon={ClipboardList}
          title="No prescriptions yet"
          description="After a consultation, prescriptions your doctor issues show up here."
          action={
            <Link to="/doctors" className={buttonVariants({})}>
              Find a doctor
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-4">
            {data.data.map((prescription) => (
              <div key={prescription.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3.5">
                    <Avatar
                      firstName={prescription.doctor.name.replace('Dr. ', '').split(' ')[0]}
                      lastName={prescription.doctor.name.replace('Dr. ', '').split(' ').slice(1).join(' ')}
                      imageUrl={prescription.doctor.avatarUrl}
                    />
                    <div>
                      <Link to={`/doctors/${prescription.doctor.slug}`} className="font-semibold text-foreground hover:text-primary">
                        {prescription.doctor.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{prescription.doctor.primarySpecialty}</p>
                      <p className="mt-2 text-sm text-foreground">{prescription.diagnosis ?? 'Prescription'}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Pill className="h-4 w-4" /> {prescription.itemCount} medicine{prescription.itemCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="success">Issued</Badge>
                    <span className="text-xs text-muted-foreground">
                      {prescription.issuedAt
                        ? new Date(prescription.issuedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })
                        : ''}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{prescription.prescriptionNumber}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/prescriptions/${prescription.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                    View prescription
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

import { ArrowLeft, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ErrorState } from '@/components/error-state';
import { PrescriptionSheet } from '@/components/prescription-sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIssuePrescription, usePrescription } from '@/hooks/use-prescriptions';

export function DoctorPrescriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: prescription, isLoading, isError, refetch } = usePrescription(id);
  const issue = useIssuePrescription();

  if (isLoading) return <Skeleton className="h-[32rem] w-full" />;
  if (isError || !prescription) return <ErrorState message="We couldn't load this prescription." onRetry={() => refetch()} />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="print-hidden flex flex-wrap items-center justify-between gap-3">
        <Link to="/doctor/prescriptions" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          <ArrowLeft className="h-4 w-4" /> All prescriptions
        </Link>
        <div className="flex gap-2">
          {prescription.status === 'DRAFT' && (
            <Button size="sm" disabled={issue.isPending} onClick={() => issue.mutate(prescription.id)}>
              {issue.isPending ? 'Issuing…' : 'Issue prescription'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <PrescriptionSheet prescription={prescription} />

      {prescription.consultationId && (
        <Link to={`/doctor/consultations/${prescription.consultationId}`} className="print-hidden block text-center text-sm font-medium text-primary hover:underline">
          Open the consultation this came from
        </Link>
      )}
    </div>
  );
}

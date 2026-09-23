import { ArrowLeft, Printer, ShoppingBag } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ErrorState } from '@/components/error-state';
import { PrescriptionSheet } from '@/components/prescription-sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrescription } from '@/hooks/use-prescriptions';

export function PrescriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: prescription, isLoading, isError, refetch } = usePrescription(id);

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-[32rem] w-full" />
      </div>
    );
  }
  if (isError || !prescription) {
    return (
      <div className="container py-8">
        <ErrorState message="We couldn't load this prescription." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="print-hidden flex flex-wrap items-center justify-between gap-3">
          <Link to="/prescriptions" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <ArrowLeft className="h-4 w-4" /> My prescriptions
          </Link>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>

        <PrescriptionSheet prescription={prescription} />

        <div className="print-hidden rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
          <Button size="lg" disabled>
            <ShoppingBag className="h-4.5 w-4.5" /> Order Medicines
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">
            Choosing a pharmacy and ordering these medicines is launching in the next update to this demo. Meanwhile you can{' '}
            <Link to="/medicines" className="font-medium text-primary hover:underline">
              browse the medicine catalogue
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { CheckCircle2, Clock, MapPin, Store, Truck } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { RatingStars } from '@/components/rating-stars';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCartFromPrescription } from '@/hooks/use-cart';
import { usePrescription, usePrescriptionPharmacies } from '@/hooks/use-prescriptions';
import { formatCurrency } from '@/lib/utils';

/** Step 2 of "Order Medicines": Prescription -> Available Pharmacies -> Choose Pharmacy -> Cart. */
export function ChoosePharmacyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const prescription = usePrescription(id);
  const pharmacies = usePrescriptionPharmacies(id);
  const fromPrescription = useCartFromPrescription();
  const [error, setError] = useState<string | null>(null);
  const [choosingId, setChoosingId] = useState<string | null>(null);

  async function choose(pharmacyId: string) {
    setError(null);
    setChoosingId(pharmacyId);
    try {
      const result = await fromPrescription.mutateAsync({ prescriptionId: id!, pharmacyId });
      navigate('/cart', { state: { unmatchedItems: result.unmatchedItems } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not start your order at that pharmacy.');
      setChoosingId(null);
    }
  }

  if (prescription.isLoading || pharmacies.isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (prescription.isError || pharmacies.isError || !prescription.data) {
    return (
      <div className="container py-8">
        <ErrorState message="We couldn't load pharmacies for this prescription." onRetry={() => { prescription.refetch(); pharmacies.refetch(); }} />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <PageHeader title="Choose a Pharmacy" subtitle={`For prescription ${prescription.data.prescriptionNumber}`} />
      <p className="mb-6 text-sm text-muted-foreground">
        You choose which pharmacy fulfils your prescription. <Link to={`/prescriptions/${id}`} className="font-medium text-primary hover:underline">View the prescription</Link>.
      </p>

      {error && <p className="mb-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {!pharmacies.data?.length ? (
        <EmptyState icon={Store} title="No pharmacies available" description="No pharmacies currently accept prescription orders. Please check back soon." />
      ) : (
        <div className="space-y-3">
          {pharmacies.data.map((match) => (
            <div key={match.pharmacy.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start gap-3">
                {match.pharmacy.logoUrl ? (
                  <img src={match.pharmacy.logoUrl} alt={match.pharmacy.name} className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Store className="h-5 w-5" />
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/pharmacies/${match.pharmacy.slug}`} className="font-semibold text-foreground hover:text-primary">
                      {match.pharmacy.name}
                    </Link>
                    <Badge variant={match.pharmacy.isOpenNow ? 'success' : 'muted'}>{match.pharmacy.isOpenNow ? 'Open' : 'Closed'}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <RatingStars rating={match.pharmacy.avgRating} showValue={false} />
                    {match.pharmacy.locality && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {match.pharmacy.locality}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {match.pharmacy.hoursLabel}
                    </span>
                    {match.pharmacy.deliveryAvailable && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {match.pharmacy.deliveryEtaMinMinutes && match.pharmacy.deliveryEtaMaxMinutes ? `${match.pharmacy.deliveryEtaMinMinutes}-${match.pharmacy.deliveryEtaMaxMinutes} min` : 'Delivery'}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={match.hasAllItems ? 'success' : match.matchedItemCount > 0 ? 'warning' : 'destructive'}>
                      {match.hasAllItems && <CheckCircle2 className="h-3 w-3" />}
                      {match.matchedItemCount} of {match.totalItemCount} medicines available
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                {match.matchedItemCount > 0 && <span className="text-sm font-semibold text-foreground">Est. {formatCurrency(match.estimatedTotal)}</span>}
                <Button size="sm" disabled={match.matchedItemCount === 0 || fromPrescription.isPending} onClick={() => choose(match.pharmacy.id)}>
                  {choosingId === match.pharmacy.id && fromPrescription.isPending ? 'Starting order…' : 'Choose Pharmacy'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

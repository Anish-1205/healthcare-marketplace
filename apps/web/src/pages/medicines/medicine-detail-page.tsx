import { Pill, Truck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state';
import { RatingStars } from '@/components/rating-stars';
import { Skeleton } from '@/components/ui/skeleton';
import { useMedicine } from '@/hooks/use-medicines';
import { useCartStore } from '@/store/cart-store';
import { formatCurrency } from '@/lib/utils';

export function MedicineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: medicine, isLoading, isError, refetch } = useMedicine(id);
  const addItem = useCartStore((s) => s.addItem);

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (isError || !medicine) {
    return (
      <div className="container py-8">
        <ErrorState message="We couldn't find this medicine." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex aspect-square items-center justify-center rounded-2xl bg-mint">
          {medicine.imageUrl ? <img src={medicine.imageUrl} alt={medicine.name} className="h-3/4 w-3/4 object-contain" /> : <Pill className="h-24 w-24 text-mint-foreground/50" />}
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">{medicine.brand}</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{medicine.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {medicine.genericName} · {medicine.manufacturer}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{medicine.packSize}</p>

          {medicine.requiresPrescription && (
            <Badge variant="warning" className="mt-3">
              Prescription Required
            </Badge>
          )}

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-foreground">{formatCurrency(medicine.bestPrice ?? medicine.mrp)}</span>
            {medicine.discountPercent ? (
              <>
                <span className="text-base text-muted-foreground line-through">{formatCurrency(medicine.mrp)}</span>
                <span className="text-sm font-semibold text-secondary">{medicine.discountPercent}% off</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">MRP {formatCurrency(medicine.mrp)}</span>
            )}
          </div>

          {medicine.description && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{medicine.description}</p>}

          <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
            This is a demonstration application. Medicine information shown here is sample data and must not be used for medical decisions.
          </p>

          <div className="mt-6">
            <h2 className="mb-3 text-base font-semibold text-foreground">Available at {medicine.pharmacies.length} pharmac{medicine.pharmacies.length === 1 ? 'y' : 'ies'}</h2>
            {medicine.pharmacies.length === 0 ? (
              <p className="text-sm text-muted-foreground">Currently out of stock everywhere. Please check back soon.</p>
            ) : (
              <div className="space-y-2.5">
                {medicine.pharmacies.map((offer) => (
                  <div key={offer.pharmacyId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3.5">
                    <div>
                      <Link to={`/pharmacies/${offer.pharmacySlug}`} className="text-sm font-semibold text-foreground hover:text-primary">
                        {offer.pharmacyName}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <RatingStars rating={offer.avgRating} showValue={false} />
                        {offer.locality && <span>{offer.locality}</span>}
                        {offer.deliveryEtaMinMinutes && (
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" /> {offer.deliveryEtaMinMinutes}-{offer.deliveryEtaMaxMinutes} min
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-foreground">{formatCurrency(offer.sellingPrice)}</span>
                      <Button
                        size="sm"
                        onClick={() =>
                          addItem(offer.pharmacyId, offer.pharmacyName, {
                            medicineId: medicine.id,
                            name: medicine.name,
                            imageUrl: medicine.imageUrl,
                            packSize: medicine.packSize,
                            requiresPrescription: medicine.requiresPrescription,
                            unitPrice: offer.sellingPrice,
                            mrp: offer.mrp,
                          })
                        }
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

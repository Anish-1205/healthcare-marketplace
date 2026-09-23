import { Pill, Truck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state';
import { QuantityStepper } from '@/components/quantity-stepper';
import { RatingStars } from '@/components/rating-stars';
import { Skeleton } from '@/components/ui/skeleton';
import { useAddToCart } from '@/hooks/use-add-to-cart';
import { useCart, useRemoveCartItem, useUpdateCartItem } from '@/hooks/use-cart';
import { useMedicine } from '@/hooks/use-medicines';
import { formatCurrency } from '@/lib/utils';

export function MedicineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: medicine, isLoading, isError, refetch } = useMedicine(id);
  const { data: cart } = useCart();
  const { addToCart, isPending, conflict, cancelConflict, error } = useAddToCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

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

  function handleQuantityChange(next: number) {
    if (next <= 0) removeItem.mutate(medicine!.id);
    else updateItem.mutate({ medicineId: medicine!.id, quantity: next });
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
                {medicine.pharmacies.map((offer) => {
                  const cartLine = cart?.pharmacy?.id === offer.pharmacyId ? cart.items.find((item) => item.medicineId === medicine.id) : undefined;
                  return (
                    <div key={offer.pharmacyId} className="rounded-xl border border-border p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
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
                          {cartLine ? (
                            <QuantityStepper
                              quantity={cartLine.quantity}
                              onChange={handleQuantityChange}
                              disabled={updateItem.isPending || removeItem.isPending}
                              className="w-28"
                            />
                          ) : (
                            <Button
                              size="sm"
                              disabled={isPending}
                              onClick={() => addToCart({ medicineId: medicine.id, pharmacyId: offer.pharmacyId, quantity: 1 })}
                            >
                              Add
                            </Button>
                          )}
                        </div>
                      </div>
                      {conflict && (
                        <div className="mt-2.5 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
                          <p>{conflict.message}</p>
                          <div className="mt-1.5 flex gap-3">
                            <button onClick={conflict.confirm} className="font-semibold underline">
                              Replace cart
                            </button>
                            <button onClick={cancelConflict} className="text-amber-700">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

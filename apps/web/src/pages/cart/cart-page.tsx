import type { UnmatchedReason } from '@carebridge/shared';
import { AlertTriangle, ClipboardList, Pill, ShoppingCart, Store, Trash2, Truck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { QuantityStepper } from '@/components/quantity-stepper';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart, useClearCart, useRemoveCartItem, useUpdateCartItem } from '@/hooks/use-cart';
import { formatCurrency } from '@/lib/utils';

const UNMATCHED_LABEL: Record<UnmatchedReason, string> = {
  NOT_STOCKED: 'not stocked at this pharmacy',
  NO_CATALOG_MATCH: "written by hand — couldn't be matched to the catalogue",
  OUT_OF_STOCK: 'currently out of stock',
};

export function CartPage() {
  const location = useLocation();
  const { data: cart, isLoading, isError, refetch } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const clearCart = useClearCart();
  const unmatchedItems = (location.state as { unmatchedItems?: Array<{ medicineName: string; reason: UnmatchedReason }> } | null)?.unmatchedItems;

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (isError || !cart) {
    return (
      <div className="container py-8">
        <ErrorState message="We couldn't load your cart." onRetry={() => refetch()} />
      </div>
    );
  }

  const unmatchedBanner = unmatchedItems && unmatchedItems.length > 0 && (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">{unmatchedItems.length} medicine{unmatchedItems.length === 1 ? '' : 's'} from your prescription couldn't be added:</p>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
        {unmatchedItems.map((item, index) => (
          <li key={index}>
            {item.medicineName} — {UNMATCHED_LABEL[item.reason]}
          </li>
        ))}
      </ul>
    </div>
  );

  if (!cart.items.length) {
    return (
      <div className="container py-8">
        <PageHeader title="Your Cart" />
        {unmatchedBanner}
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Browse medicines or order from a prescription to get started."
          action={
            <Link to="/medicines" className={buttonVariants({})}>
              Browse Medicines
            </Link>
          }
        />
      </div>
    );
  }

  function handleQuantityChange(medicineId: string, next: number) {
    if (next <= 0) removeItem.mutate(medicineId);
    else updateItem.mutate({ medicineId, quantity: next });
  }

  return (
    <div className="container py-8">
      <PageHeader title="Your Cart" subtitle={`${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'}`} />
      {unmatchedBanner}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {cart.pharmacy && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Store className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <Link to={`/pharmacies/${cart.pharmacy.slug}`} className="font-semibold text-foreground hover:text-primary">
                  {cart.pharmacy.name}
                </Link>
                <p className="text-xs text-muted-foreground">{cart.pharmacy.locality}</p>
              </div>
              {cart.pharmacy.deliveryAvailable && (
                <Badge variant="success">
                  <Truck className="h-3 w-3" />
                  {cart.pharmacy.deliveryEtaMinMinutes && cart.pharmacy.deliveryEtaMaxMinutes
                    ? `${cart.pharmacy.deliveryEtaMinMinutes}-${cart.pharmacy.deliveryEtaMaxMinutes} min`
                    : 'Delivery available'}
                </Badge>
              )}
              {cart.pharmacy.pickupAvailable && <Badge variant="outline">Store Pickup</Badge>}
            </div>
          )}

          {cart.prescriptionNumber && (
            <Link
              to={`/prescriptions/${cart.prescriptionId}`}
              className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm text-accent-foreground hover:bg-accent/80"
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              Ordering from prescription <strong>{cart.prescriptionNumber}</strong>
            </Link>
          )}

          <div className="space-y-3">
            {cart.items.map((item) => {
              const shortBy = item.quantity - item.availableStock;
              return (
                <div key={item.medicineId} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-4">
                    <Link to={`/medicines/${item.slug}`} className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-mint">
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-3/4 w-3/4 object-contain" /> : <Pill className="h-6 w-6 text-mint-foreground/50" />}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link to={`/medicines/${item.slug}`} className="line-clamp-1 text-sm font-semibold text-foreground hover:text-primary">
                        {item.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{item.packSize}</p>
                      {item.requiresPrescription && (
                        <Badge variant="warning" className="mt-1">
                          Prescription Required
                        </Badge>
                      )}
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-sm font-bold text-foreground">{formatCurrency(item.unitPrice)}</span>
                        {item.unitPrice < item.unitMrp && <span className="text-xs text-muted-foreground line-through">{formatCurrency(item.unitMrp)}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <QuantityStepper quantity={item.quantity} onChange={(next) => handleQuantityChange(item.medicineId, next)} disabled={updateItem.isPending || removeItem.isPending} className="w-28" />
                      <button onClick={() => removeItem.mutate(item.medicineId)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                  {!item.isAvailable ? (
                    <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> No longer available at this pharmacy — remove it to continue.
                    </p>
                  ) : (
                    shortBy > 0 && (
                      <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Only {item.availableStock} left in stock — reduce the quantity to continue.
                      </p>
                    )
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={() => clearCart.mutate()} disabled={clearCart.isPending} className="text-sm text-muted-foreground hover:text-destructive">
            Clear cart
          </button>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Order Summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">MRP Total</dt>
                <dd className="font-medium text-foreground">{formatCurrency(cart.subtotalMrp)}</dd>
              </div>
              {cart.discountTotal > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="font-medium text-secondary">-{formatCurrency(cart.discountTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base">
                <dt className="font-semibold text-foreground">Item Total</dt>
                <dd className="font-bold text-foreground">{formatCurrency(cart.itemTotal)}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">Delivery and platform fees are calculated at checkout.</p>

            {cart.hasUnavailableItems ? <Button size="lg" className="w-full" disabled>Proceed to Checkout</Button> : <Link to="/checkout" className={buttonVariants({ size: 'lg', className: 'w-full' })}>Proceed to Checkout</Link>}
            {cart.hasUnavailableItems ? (
              <p className="text-xs text-destructive">Resolve the availability issues above before checkout.</p>
            ) : (
              <p className="text-xs text-muted-foreground">Choose delivery or pickup and a simulated payment at checkout.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

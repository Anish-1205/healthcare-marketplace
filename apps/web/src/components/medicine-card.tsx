import type { MedicineSummary } from '@carebridge/shared';
import { Pill } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { QuantityStepper } from '@/components/quantity-stepper';
import { useAddToCart } from '@/hooks/use-add-to-cart';
import { useCart, useRemoveCartItem, useUpdateCartItem } from '@/hooks/use-cart';
import { cn, formatCurrency } from '@/lib/utils';

/**
 * A cart is bound to one pharmacy (see `cart.service.ts`), so this card only offers a direct
 * Add/quantity control when it already knows which pharmacy it's shopping for (`pharmacyId` —
 * set on a pharmacy's own page, or the "shop this pharmacy" filter). Otherwise — the generic
 * catalogue browse, where the price shown is the best across pharmacies — it sends the shopper
 * to the medicine page to pick a pharmacy, per-offer, themselves.
 */
export function MedicineCard({ medicine, pharmacyId, className }: { medicine: MedicineSummary; pharmacyId?: string; className?: string }) {
  const { data: cart } = useCart();
  const { addToCart, isPending, conflict, cancelConflict, error } = useAddToCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  const cartLine = pharmacyId && cart?.pharmacy?.id === pharmacyId ? cart.items.find((item) => item.medicineId === medicine.id) : undefined;
  const outOfStock = medicine.inStockPharmacyCount === 0;
  const price = medicine.bestPrice ?? medicine.mrp;

  function handleQuantityChange(next: number) {
    if (next <= 0) removeItem.mutate(medicine.id);
    else updateItem.mutate({ medicineId: medicine.id, quantity: next });
  }

  return (
    <div className={cn('flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md', className)}>
      <Link to={`/medicines/${medicine.slug}`} className="flex aspect-square items-center justify-center rounded-xl bg-mint">
        {medicine.imageUrl ? (
          <img src={medicine.imageUrl} alt={medicine.name} className="h-3/4 w-3/4 object-contain" />
        ) : (
          <Pill className="h-10 w-10 text-mint-foreground/50" />
        )}
      </Link>

      <div className="mt-3 flex-1">
        <Link to={`/medicines/${medicine.slug}`} className="line-clamp-2 text-sm font-semibold text-foreground hover:text-primary">
          {medicine.name}
        </Link>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{medicine.manufacturer}</p>
        <p className="text-xs text-muted-foreground">{medicine.packSize}</p>
      </div>

      {medicine.requiresPrescription && (
        <Badge variant="warning" className="mt-2 w-fit">
          Prescription Required
        </Badge>
      )}

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-base font-bold text-foreground">{formatCurrency(price)}</span>
        {medicine.discountPercent ? (
          <>
            <span className="text-xs text-muted-foreground line-through">{formatCurrency(medicine.mrp)}</span>
            <span className="text-xs font-semibold text-secondary">{medicine.discountPercent}% off</span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">MRP {formatCurrency(medicine.mrp)}</span>
        )}
      </div>

      <div className="mt-3">
        {outOfStock ? (
          <Button size="sm" variant="outline" disabled className="w-full">
            Out of Stock
          </Button>
        ) : !pharmacyId ? (
          <Link to={`/medicines/${medicine.slug}`} className={buttonVariants({ size: 'sm', variant: 'outline', className: 'w-full' })}>
            Compare Pharmacies
          </Link>
        ) : cartLine ? (
          <QuantityStepper quantity={cartLine.quantity} onChange={handleQuantityChange} disabled={updateItem.isPending || removeItem.isPending} />
        ) : (
          <Button size="sm" className="w-full" disabled={isPending} onClick={() => addToCart({ medicineId: medicine.id, pharmacyId, quantity: 1 })}>
            Add
          </Button>
        )}
      </div>

      {conflict && (
        <div className="mt-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900">
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
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

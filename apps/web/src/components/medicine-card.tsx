import type { MedicineSummary } from '@carebridge/shared';
import { Minus, Pill, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart-store';
import { cn, formatCurrency } from '@/lib/utils';

export function MedicineCard({ medicine, className }: { medicine: MedicineSummary; className?: string }) {
  const lines = useCartStore((s) => s.lines);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const line = lines.find((l) => l.medicineId === medicine.id);
  const outOfStock = medicine.inStockPharmacyCount === 0;
  const price = medicine.bestPrice ?? medicine.mrp;

  function handleAdd() {
    // Demo cart: the first pharmacy carrying the item is used as a placeholder until a pharmacy is chosen at checkout.
    addItem('unassigned', 'Choose at checkout', {
      medicineId: medicine.id,
      name: medicine.name,
      imageUrl: medicine.imageUrl,
      packSize: medicine.packSize,
      requiresPrescription: medicine.requiresPrescription,
      unitPrice: price,
      mrp: medicine.mrp,
    });
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
        ) : line ? (
          <div className="flex items-center justify-between rounded-full bg-primary px-1 py-1">
            <button onClick={() => updateQuantity(medicine.id, line.quantity - 1)} className="flex h-8 w-8 items-center justify-center rounded-full text-primary-foreground hover:bg-white/10" aria-label="Decrease quantity">
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-primary-foreground">{line.quantity}</span>
            <button onClick={() => updateQuantity(medicine.id, line.quantity + 1)} className="flex h-8 w-8 items-center justify-center rounded-full text-primary-foreground hover:bg-white/10" aria-label="Increase quantity">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Button size="sm" className="w-full" onClick={handleAdd}>
            Add
          </Button>
        )}
      </div>
    </div>
  );
}

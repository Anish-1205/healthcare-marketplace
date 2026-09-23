import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Cart-line quantity control — a pill with +/- buttons, used on product cards and the cart page. */
export function QuantityStepper({
  quantity,
  onChange,
  disabled,
  max = 50,
  className,
}: {
  quantity: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  max?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between rounded-full bg-primary px-1 py-1', disabled && 'opacity-60', className)}>
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        disabled={disabled}
        className="flex h-8 w-8 items-center justify-center rounded-full text-primary-foreground hover:bg-white/10 disabled:pointer-events-none"
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="text-sm font-semibold text-primary-foreground">{quantity}</span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        disabled={disabled || quantity >= max}
        className="flex h-8 w-8 items-center justify-center rounded-full text-primary-foreground hover:bg-white/10 disabled:pointer-events-none"
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

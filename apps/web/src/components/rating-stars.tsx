import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RatingStars({ rating, className, showValue = true }: { rating: number; className?: string; showValue?: boolean }) {
  if (rating <= 0) {
    return <span className={cn('text-xs font-medium text-muted-foreground', className)}>New</span>;
  }
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="text-sm font-semibold text-foreground">{rating.toFixed(1)}</span>
      {showValue && <span className="text-xs text-muted-foreground">rating</span>}
    </span>
  );
}

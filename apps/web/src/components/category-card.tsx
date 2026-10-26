import { RevealCard } from '@/components/motion';
import { Link } from 'react-router-dom';
import type { MedicineCategoryRef } from '@/api/reference';
import { iconFor } from '@/lib/icon-map';
import { cn } from '@/lib/utils';

const SURFACE_CLASS: Record<string, string> = {
  mint: 'bg-mint text-mint-foreground',
  cream: 'bg-cream text-cream-foreground',
  pink: 'bg-blush text-blush-foreground',
  blue: 'bg-sky text-sky-foreground',
  lavender: 'bg-lavender text-lavender-foreground',
};

export function CategoryCard({ category, className }: { category: MedicineCategoryRef; className?: string }) {
  const Icon = iconFor(category.icon);
  const surface = category.imageUrl
    ? 'border border-border bg-card text-foreground shadow-sm'
    : (SURFACE_CLASS[category.colorTheme ?? 'mint'] ?? SURFACE_CLASS.mint);
  return (
    <RevealCard className="h-full">
    <Link
      to={`/medicine-categories/${category.slug}`}
      className={cn('group flex flex-col items-center gap-3 rounded-2xl p-5 text-center shadow-soft interactive-card', category.imageUrl && 'p-3', surface, className)}
    >
      {category.imageUrl ? (
        <img src={category.imageUrl} alt="" className="aspect-[4/3] w-full object-contain" />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/60 shadow-sm">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <div>
        <p className="text-sm font-semibold">{category.name}</p>
        <p className="text-xs opacity-70">{category.medicineCount} products</p>
      </div>
    </Link>
    </RevealCard>
  );
}

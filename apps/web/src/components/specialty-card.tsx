import { RevealCard } from '@/components/motion';
import { Link } from 'react-router-dom';
import type { SpecialtyRef } from '@/api/reference';
import { iconFor } from '@/lib/icon-map';
import { cn } from '@/lib/utils';

export function SpecialtyCard({ specialty, className }: { specialty: SpecialtyRef; className?: string }) {
  const Icon = iconFor(specialty.icon);
  return (
    <RevealCard className="h-full">
    <Link
      to={`/doctors?specialty=${specialty.slug}`}
      className={cn('group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center shadow-sm shadow-soft interactive-card', className)}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{specialty.name}</p>
        <p className="text-xs text-muted-foreground">{specialty.doctorCount} doctors</p>
      </div>
    </Link>
    </RevealCard>
  );
}

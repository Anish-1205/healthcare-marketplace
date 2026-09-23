import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, resultCount, action }: { title: string; subtitle?: string; resultCount?: number; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
        {resultCount !== undefined && <p className="mt-1 text-xs font-medium text-muted-foreground">{resultCount} result{resultCount === 1 ? '' : 's'}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, resultCount }: { title: string; subtitle?: string; resultCount?: number }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      {resultCount !== undefined && <p className="mt-1 text-xs font-medium text-muted-foreground">{resultCount} result{resultCount === 1 ? '' : 's'}</p>}
    </div>
  );
}

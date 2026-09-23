import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Section({
  title,
  subtitle,
  viewAllHref,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn('container py-10 sm:py-12', className)}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground sm:text-[28px]">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {viewAllHref && (
          <Link to={viewAllHref} className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline sm:flex">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
      {viewAllHref && (
        <Link to={viewAllHref} className="mt-5 flex items-center justify-center gap-1 text-sm font-semibold text-primary sm:hidden">
          View All <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </section>
  );
}

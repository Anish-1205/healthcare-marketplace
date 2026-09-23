import { cn } from '@/lib/utils';

export function ScrollRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2', className)}>
      {children}
    </div>
  );
}

export function ScrollItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('w-[260px] shrink-0 snap-start sm:w-[280px]', className)}>{children}</div>;
}

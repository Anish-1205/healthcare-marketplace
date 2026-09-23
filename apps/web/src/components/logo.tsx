import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2 font-extrabold tracking-tight', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path d="M12 21s-7.5-4.6-10-9.3C.4 8.1 2.4 4 6.3 4c2 0 3.6 1.1 4.7 2.6C12.1 5.1 13.7 4 15.7 4c3.9 0 5.9 4.1 4.3 7.7C19.5 16.4 12 21 12 21z" fill="currentColor" opacity="0.35" />
          <path d="M8 12.5h2.4l1-2.6 1.6 5.2 1-2.6H16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-lg text-foreground">
        Care<span className="text-primary">Bridge</span>
      </span>
    </Link>
  );
}

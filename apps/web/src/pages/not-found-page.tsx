import { SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <SearchX className="h-7 w-7" />
      </span>
      <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">The page you're looking for doesn't exist or may have moved.</p>
      <Link to="/" className={buttonVariants()}>
        Back to Home
      </Link>
    </div>
  );
}

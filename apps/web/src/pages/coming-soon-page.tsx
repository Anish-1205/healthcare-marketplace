import { Construction } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';

/**
 * Placeholder for routes not yet built (appointments, orders, prescriptions, etc. arrive in
 * later phases). Shown instead of a 404 or a fake feature, per the demo-quality bar.
 */
export function ComingSoonPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Construction className="h-7 w-7" />
      </span>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{description ?? 'This part of the CareBridge demo is being built in an upcoming phase.'}</p>
      <Link to="/" className={buttonVariants({ variant: 'outline' })}>
        Back to Home
      </Link>
    </div>
  );
}

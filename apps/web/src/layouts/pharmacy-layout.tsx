import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';
export function PharmacyLayout() {
  const user = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const membership = user?.memberships.find((item) => item.organizationType === 'PHARMACY');
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-6 py-4">
        <Logo />
        <p className="text-sm font-semibold">Pharmacy Portal</p>
        <div className="flex items-center gap-4">
          <span className="text-sm">{user?.firstName}</span>
          <Button variant="ghost" onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login') })}>
            Sign out
          </Button>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:flex-row md:p-6">
        <aside className="md:w-48 md:shrink-0">
          <nav>
            <NavLink to="/pharmacy/orders" className="block rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">
              Orders & deliveries
            </NavLink>
          </nav>
          <p className="mt-4 text-xs text-muted-foreground">Demo workspace. Payments and delivery are simulated.</p>
        </aside>
        <main className="min-w-0 flex-1">
          {membership && membership.approvalStatus !== 'APPROVED' && (
            <p role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {membership.approvalStatus === 'REJECTED'
                ? 'Your pharmacy registration was not approved. Contact the platform team for details.'
                : 'Pending approval: your pharmacy will appear in patient search after the platform team approves your registration.'}
            </p>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

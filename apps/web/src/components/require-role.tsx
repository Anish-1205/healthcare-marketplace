import type { Role } from '@carebridge/shared';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCurrentUser, useIsAuthenticated } from '@/hooks/use-auth';

/**
 * Route guard for a portal restricted to one or more roles (e.g. the doctor portal).
 * Signed-out visitors go to login and back; signed-in users with the wrong role go home
 * rather than seeing a portal that isn't theirs.
 */
export function RequireRole({ roles }: { roles: Role[] }) {
  const isAuthenticated = useIsAuthenticated();
  const user = useCurrentUser();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  if (!user || !roles.some((role) => user.roles.includes(role))) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

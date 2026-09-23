import { Navigate, Outlet } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/use-auth';

export function RequirePermission({ permission }: { permission: string }) {
  const user = useCurrentUser();
  return user?.permissions.includes(permission) ? <Outlet /> : <Navigate to="/admin" replace />;
}

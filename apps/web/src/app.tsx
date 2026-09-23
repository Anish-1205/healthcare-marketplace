import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from '@/api/query-client';
import { useIsAuthenticated, useMe } from '@/hooks/use-auth';
import { router } from '@/routes/router';

/** Refreshes the current user from the server on load, so role/permission changes take effect. */
function AuthBootstrap() {
  const isAuthenticated = useIsAuthenticated();
  useMe(isAuthenticated);
  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

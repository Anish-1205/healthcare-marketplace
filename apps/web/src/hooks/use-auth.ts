import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, type LoginPayload, type RegisterPatientPayload } from '@/api/auth';
import { useAuthStore } from '@/store/auth-store';

/** Reactive current-user snapshot from the store (instant, no request). */
export function useCurrentUser() {
  return useAuthStore((state) => state.user);
}

export function useIsAuthenticated() {
  return useAuthStore((state) => Boolean(state.token));
}

export function useHasPermission(permission: string) {
  return useAuthStore((state) => Boolean(state.user?.permissions.includes(permission)));
}

/** Refreshes `user` from the server (roles/permissions can change server-side). */
export function useMe(enabled: boolean) {
  const setUser = useAuthStore((state) => state.setUser);
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const user = await authApi.me();
      setUser(user);
      return user;
    },
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      setSession(data.token, data.user);
      queryClient.invalidateQueries();
    },
  });
}

export function useRegisterPatient() {
  const setSession = useAuthStore((state) => state.setSession);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterPatientPayload) => authApi.register(payload),
    onSuccess: (data) => {
      setSession(data.token, data.user);
      queryClient.invalidateQueries();
    },
  });
}

export function useLogout() {
  const clear = useAuthStore((state) => state.clear);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clear();
      queryClient.clear();
    },
  });
}

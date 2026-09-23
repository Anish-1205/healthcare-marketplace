import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi, type AddressPayload, type UpdateProfilePayload } from '@/api/profile';

export function useProfile() {
  return useQuery({ queryKey: ['profile'], queryFn: () => profileApi.get() });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => profileApi.update(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }); // header name/avatar
    },
  });
}

export function useAddresses() {
  return useQuery({ queryKey: ['profile', 'addresses'], queryFn: () => profileApi.addresses() });
}

export function useSaveAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: AddressPayload }) => (id ? profileApi.updateAddress(id, payload) : profileApi.createAddress(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'addresses'] });
      queryClient.invalidateQueries({ queryKey: ['checkout'] });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => profileApi.deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'addresses'] });
      queryClient.invalidateQueries({ queryKey: ['checkout'] });
    },
  });
}

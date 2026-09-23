import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddCartItemPayload, CartFromPrescriptionPayload, UpdateCartItemPayload } from '@carebridge/shared';
import { cartApi } from '@/api/cart';
import { useIsAuthenticated, useCurrentUser } from './use-auth';

export function useCart() {
  const isAuthenticated = useIsAuthenticated();
  const user = useCurrentUser();
  return useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.get(),
    enabled: isAuthenticated && Boolean(user?.patientId),
  });
}

/** For the header/nav badge — 0 when signed out rather than an error or a spinner. */
export function useCartCount() {
  const { data } = useCart();
  return data?.itemCount ?? 0;
}

function useCartMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => queryClient.setQueryData(['cart'], data),
  });
}

export function useAddCartItem() {
  return useCartMutation((payload: AddCartItemPayload) => cartApi.addItem(payload));
}

export function useUpdateCartItem() {
  return useCartMutation(({ medicineId, ...payload }: UpdateCartItemPayload & { medicineId: string }) => cartApi.updateItem(medicineId, payload));
}

export function useRemoveCartItem() {
  return useCartMutation((medicineId: string) => cartApi.removeItem(medicineId));
}

export function useClearCart() {
  return useCartMutation(() => cartApi.clear());
}

export function useCartFromPrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CartFromPrescriptionPayload) => cartApi.fromPrescription(payload),
    onSuccess: (result) => queryClient.setQueryData(['cart'], result.cart),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreatePrescriptionPayload, UpdatePrescriptionPayload } from '@carebridge/shared';
import { prescriptionsApi, type ListPrescriptionsParams } from '@/api/prescriptions';
import { useIsAuthenticated } from './use-auth';

export function usePrescriptions(params: ListPrescriptionsParams = {}) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ['prescriptions', params],
    queryFn: () => prescriptionsApi.list(params),
    enabled: isAuthenticated,
    placeholderData: (previous) => previous,
  });
}

export function usePrescription(id: string | undefined) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ['prescriptions', 'detail', id],
    queryFn: () => prescriptionsApi.detail(id!),
    enabled: isAuthenticated && Boolean(id),
  });
}

/** Pharmacies able to fulfil an issued prescription, for the "choose a pharmacy" step. */
export function usePrescriptionPharmacies(id: string | undefined) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ['prescriptions', 'pharmacies', id],
    queryFn: () => prescriptionsApi.pharmacies(id!),
    enabled: isAuthenticated && Boolean(id),
  });
}

function usePrescriptionMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useCreatePrescription() {
  return usePrescriptionMutation((payload: CreatePrescriptionPayload) => prescriptionsApi.create(payload));
}

export function useUpdatePrescription() {
  return usePrescriptionMutation(({ id, ...payload }: UpdatePrescriptionPayload & { id: string }) => prescriptionsApi.update(id, payload));
}

export function useIssuePrescription() {
  return usePrescriptionMutation((id: string) => prescriptionsApi.issue(id));
}

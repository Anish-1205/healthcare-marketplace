import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateConsultationPayload } from '@carebridge/shared';
import { consultationsApi, type ListConsultationsParams } from '@/api/consultations';
import { useIsAuthenticated } from './use-auth';

export function useConsultations(params: ListConsultationsParams = {}) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ['consultations', params],
    queryFn: () => consultationsApi.list(params),
    enabled: isAuthenticated,
    placeholderData: (previous) => previous,
  });
}

export function useConsultation(id: string | undefined) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ['consultations', 'detail', id],
    queryFn: () => consultationsApi.detail(id!),
    enabled: isAuthenticated && Boolean(id),
  });
}

/** Consultation changes move appointment status and the doctor's dashboard counters too. */
function useConsultationMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-portal'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useStartConsultation() {
  return useConsultationMutation((appointmentId: string) => consultationsApi.start(appointmentId));
}

export function useUpdateConsultation() {
  return useConsultationMutation(({ id, ...payload }: UpdateConsultationPayload & { id: string }) => consultationsApi.update(id, payload));
}

export function useCompleteConsultation() {
  return useConsultationMutation((id: string) => consultationsApi.complete(id));
}

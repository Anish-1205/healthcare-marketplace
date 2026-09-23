import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BookAppointmentPayload, CancelAppointmentPayload, RescheduleAppointmentPayload, UpdateAppointmentStatusPayload } from '@carebridge/shared';
import { appointmentsApi, type ListAppointmentsParams } from '@/api/appointments';
import { useIsAuthenticated } from './use-auth';

export function useAppointments(params: ListAppointmentsParams = {}) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ['appointments', params],
    queryFn: () => appointmentsApi.list(params),
    enabled: isAuthenticated,
    placeholderData: (previous) => previous,
  });
}

export function useAppointment(id: string | undefined) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ['appointments', 'detail', id],
    queryFn: () => appointmentsApi.detail(id!),
    enabled: isAuthenticated && Boolean(id),
  });
}

/** Booking changes slot availability and notifications, so those caches are invalidated too. */
function useAppointmentMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-portal'] }); // dashboard/patient stats depend on appointment state
    },
  });
}

export function useBookAppointment() {
  return useAppointmentMutation((payload: BookAppointmentPayload) => appointmentsApi.book(payload));
}

export function useCancelAppointment() {
  return useAppointmentMutation(({ id, ...payload }: CancelAppointmentPayload & { id: string }) => appointmentsApi.cancel(id, payload));
}

export function useRescheduleAppointment() {
  return useAppointmentMutation(({ id, ...payload }: RescheduleAppointmentPayload & { id: string }) => appointmentsApi.reschedule(id, payload));
}

/** Doctor/clinic-side moves: confirm, check in, or mark a no-show. */
export function useUpdateAppointmentStatus() {
  return useAppointmentMutation(({ id, ...payload }: UpdateAppointmentStatusPayload & { id: string }) => appointmentsApi.updateStatus(id, payload));
}

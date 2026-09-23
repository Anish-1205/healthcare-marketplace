import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DoctorAvailabilityWindowInput, UpdateDoctorProfilePayload } from '@carebridge/shared';
import { doctorPortalApi, type ListMyPatientsParams } from '@/api/doctor-portal';
import { useCurrentUser } from './use-auth';

function useIsDoctor() {
  const user = useCurrentUser();
  return Boolean(user?.doctorId);
}

export function useDoctorProfile() {
  const enabled = useIsDoctor();
  return useQuery({ queryKey: ['doctor-portal', 'profile'], queryFn: () => doctorPortalApi.getProfile(), enabled });
}

export function useUpdateDoctorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateDoctorProfilePayload) => doctorPortalApi.updateProfile(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['doctor-portal', 'profile'], data);
      queryClient.invalidateQueries({ queryKey: ['doctors'] }); // public listing/detail reflect the change too
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useDoctorAvailability() {
  const enabled = useIsDoctor();
  return useQuery({ queryKey: ['doctor-portal', 'availability'], queryFn: () => doctorPortalApi.getAvailability(), enabled });
}

function useInvalidateAvailability() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['doctor-portal', 'availability'] });
    queryClient.invalidateQueries({ queryKey: ['doctors'] }); // slot lists depend on this
  };
}

export function useReplaceDoctorAvailability() {
  const invalidate = useInvalidateAvailability();
  return useMutation({
    mutationFn: (windows: DoctorAvailabilityWindowInput[]) => doctorPortalApi.replaceAvailability(windows),
    onSuccess: invalidate,
  });
}

export function useAddBlockedDate() {
  const invalidate = useInvalidateAvailability();
  return useMutation({
    mutationFn: (payload: { date: string; reason?: string }) => doctorPortalApi.addBlockedDate(payload),
    onSuccess: invalidate,
  });
}

export function useRemoveBlockedDate() {
  const invalidate = useInvalidateAvailability();
  return useMutation({
    mutationFn: (id: string) => doctorPortalApi.removeBlockedDate(id),
    onSuccess: invalidate,
  });
}

export function useDoctorDashboard() {
  const enabled = useIsDoctor();
  return useQuery({ queryKey: ['doctor-portal', 'dashboard'], queryFn: () => doctorPortalApi.getDashboard(), enabled });
}

export function useDoctorPatients(params: ListMyPatientsParams = {}) {
  const enabled = useIsDoctor();
  return useQuery({
    queryKey: ['doctor-portal', 'patients', params],
    queryFn: () => doctorPortalApi.listPatients(params),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useDoctorPatient(patientId: string | undefined) {
  const enabled = useIsDoctor() && Boolean(patientId);
  return useQuery({
    queryKey: ['doctor-portal', 'patients', 'detail', patientId],
    queryFn: () => doctorPortalApi.getPatient(patientId!),
    enabled,
  });
}

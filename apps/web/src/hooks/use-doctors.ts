import { useQuery } from '@tanstack/react-query';
import { doctorsApi, type ListDoctorsParams } from '@/api/doctors';

export function useDoctors(params: ListDoctorsParams) {
  return useQuery({
    queryKey: ['doctors', params],
    queryFn: () => doctorsApi.list(params),
    placeholderData: (previous) => previous,
  });
}

export function useDoctor(idOrSlug: string | undefined) {
  return useQuery({
    queryKey: ['doctors', idOrSlug],
    queryFn: () => doctorsApi.detail(idOrSlug!),
    enabled: Boolean(idOrSlug),
  });
}

export function useDoctorSlots(idOrSlug: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ['doctors', idOrSlug, 'slots', date],
    queryFn: () => doctorsApi.slots(idOrSlug!, date!),
    enabled: Boolean(idOrSlug && date),
  });
}

import { useQuery } from '@tanstack/react-query';
import { pharmaciesApi, type ListPharmaciesParams } from '@/api/pharmacies';

export function usePharmacies(params: ListPharmaciesParams) {
  return useQuery({
    queryKey: ['pharmacies', params],
    queryFn: () => pharmaciesApi.list(params),
    placeholderData: (previous) => previous,
  });
}

export function usePharmacy(idOrSlug: string | undefined) {
  return useQuery({
    queryKey: ['pharmacies', idOrSlug],
    queryFn: () => pharmaciesApi.detail(idOrSlug!),
    enabled: Boolean(idOrSlug),
  });
}

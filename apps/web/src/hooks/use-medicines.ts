import { useQuery } from '@tanstack/react-query';
import { medicinesApi, type ListMedicinesParams } from '@/api/medicines';

export function useMedicines(params: ListMedicinesParams) {
  return useQuery({
    queryKey: ['medicines', params],
    queryFn: () => medicinesApi.list(params),
    placeholderData: (previous) => previous,
  });
}

export function useMedicine(idOrSlug: string | undefined) {
  return useQuery({
    queryKey: ['medicines', idOrSlug],
    queryFn: () => medicinesApi.detail(idOrSlug!),
    enabled: Boolean(idOrSlug),
  });
}

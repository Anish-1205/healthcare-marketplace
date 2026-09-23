import { useQuery } from '@tanstack/react-query';
import { referenceApi } from '@/api/reference';

export function useGlobalSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['search', trimmed],
    queryFn: ({ signal }) => referenceApi.search(trimmed, signal),
    enabled: trimmed.length >= 2,
    staleTime: 15_000,
  });
}

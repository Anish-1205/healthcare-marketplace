import { useQuery } from '@tanstack/react-query';
import { organizationsApi, type ListOrganizationsParams } from '@/api/organizations';

export function useOrganizations(params: ListOrganizationsParams) {
  return useQuery({
    queryKey: ['organizations', params],
    queryFn: () => organizationsApi.list(params),
    placeholderData: (previous) => previous,
  });
}

export function useOrganization(idOrSlug: string | undefined) {
  return useQuery({
    queryKey: ['organizations', idOrSlug],
    queryFn: () => organizationsApi.detail(idOrSlug!),
    enabled: Boolean(idOrSlug),
  });
}

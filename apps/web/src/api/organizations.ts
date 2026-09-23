import type { OrganizationDetail, OrganizationSummary, OrganizationType } from '@carebridge/shared';
import { api } from './client';

export interface ListOrganizationsParams {
  page?: number;
  pageSize?: number;
  type?: OrganizationType[];
  q?: string;
  locality?: string;
  specialty?: string;
}

export const organizationsApi = {
  list: (params: ListOrganizationsParams = {}) =>
    api.getPaginated<OrganizationSummary>('/organizations', { params: { ...params, type: params.type?.join(',') } }),
  detail: (idOrSlug: string) => api.get<OrganizationDetail>(`/organizations/${idOrSlug}`),
};

import type { OrganizationDetail, OrganizationSummary } from '@carebridge/shared';
import { api } from './client';

export interface ListPharmaciesParams {
  page?: number;
  pageSize?: number;
  q?: string;
  locality?: string;
  deliveryAvailable?: boolean;
  acceptsPrescriptions?: boolean;
}

export const pharmaciesApi = {
  list: (params: ListPharmaciesParams = {}) => api.getPaginated<OrganizationSummary>('/pharmacies', { params }),
  detail: (idOrSlug: string) => api.get<OrganizationDetail>(`/pharmacies/${idOrSlug}`),
};

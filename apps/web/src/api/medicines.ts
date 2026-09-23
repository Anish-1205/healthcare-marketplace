import type { MedicineDetail, MedicineSummary } from '@carebridge/shared';
import { api } from './client';

export interface ListMedicinesParams {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: string;
  requiresPrescription?: boolean;
  pharmacyId?: string;
  sort?: string;
}

export const medicinesApi = {
  list: (params: ListMedicinesParams = {}) => api.getPaginated<MedicineSummary>('/medicines', { params }),
  detail: (idOrSlug: string) => api.get<MedicineDetail>(`/medicines/${idOrSlug}`),
};

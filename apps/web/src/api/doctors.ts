import type { AvailableSlot, ConsultationType, DoctorDetail, DoctorSummary } from '@carebridge/shared';
import { api } from './client';

export interface ListDoctorsParams {
  page?: number;
  pageSize?: number;
  q?: string;
  specialty?: string;
  organizationId?: string;
  type?: ConsultationType[];
  feeMax?: number;
  minRating?: number;
  language?: string;
  locality?: string;
  sort?: string;
}

export const doctorsApi = {
  list: (params: ListDoctorsParams = {}) =>
    api.getPaginated<DoctorSummary>('/doctors', { params: { ...params, type: params.type?.join(',') } }),
  detail: (idOrSlug: string) => api.get<DoctorDetail>(`/doctors/${idOrSlug}`),
  slots: (idOrSlug: string, date: string) => api.get<AvailableSlot[]>(`/doctors/${idOrSlug}/slots`, { params: { date } }),
};

import type {
  CreatePrescriptionPayload,
  PrescriptionDetail,
  PrescriptionStatus,
  PrescriptionSummary,
  UpdatePrescriptionPayload,
} from '@carebridge/shared';
import { api } from './client';

export interface ListPrescriptionsParams {
  page?: number;
  pageSize?: number;
  status?: PrescriptionStatus[];
  patientId?: string;
  consultationId?: string;
}

export const prescriptionsApi = {
  list: (params: ListPrescriptionsParams = {}) =>
    api.getPaginated<PrescriptionSummary>('/prescriptions', { params: { ...params, status: params.status?.join(',') } }),
  detail: (id: string) => api.get<PrescriptionDetail>(`/prescriptions/${id}`),
  create: (payload: CreatePrescriptionPayload) => api.post<PrescriptionDetail>('/prescriptions', payload),
  update: (id: string, payload: UpdatePrescriptionPayload) => api.patch<PrescriptionDetail>(`/prescriptions/${id}`, payload),
  issue: (id: string) => api.post<PrescriptionDetail>(`/prescriptions/${id}/issue`),
};

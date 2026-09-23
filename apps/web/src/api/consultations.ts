import type { ConsultationDetail, ConsultationScope, ConsultationSummary, UpdateConsultationPayload } from '@carebridge/shared';
import { api } from './client';

export interface ListConsultationsParams {
  page?: number;
  pageSize?: number;
  scope?: ConsultationScope;
  patientId?: string;
}

export const consultationsApi = {
  list: (params: ListConsultationsParams = {}) => api.getPaginated<ConsultationSummary>('/consultations', { params }),
  detail: (id: string) => api.get<ConsultationDetail>(`/consultations/${id}`),
  /** Opens (and on first call creates) the consultation for an appointment. */
  start: (appointmentId: string) => api.post<ConsultationDetail>(`/appointments/${appointmentId}/consultation`),
  update: (id: string, payload: UpdateConsultationPayload) => api.patch<ConsultationDetail>(`/consultations/${id}`, payload),
  complete: (id: string) => api.post<ConsultationDetail>(`/consultations/${id}/complete`),
};

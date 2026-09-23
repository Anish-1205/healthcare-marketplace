import type {
  AppointmentDetail,
  AppointmentScope,
  AppointmentStatus,
  AppointmentSummary,
  BookAppointmentPayload,
  CancelAppointmentPayload,
  RescheduleAppointmentPayload,
  UpdateAppointmentStatusPayload,
} from '@carebridge/shared';
import { api } from './client';

export interface ListAppointmentsParams {
  page?: number;
  pageSize?: number;
  scope?: AppointmentScope;
  status?: AppointmentStatus[];
  doctorId?: string;
  patient?: string;
  date?: string;
  consultationType?: import('@carebridge/shared').ConsultationType;
  sort?: string;
}

export const appointmentsApi = {
  list: (params: ListAppointmentsParams = {}) =>
    api.getPaginated<AppointmentSummary>('/appointments', { params: { ...params, status: params.status?.join(',') } }),
  detail: (id: string) => api.get<AppointmentDetail>(`/appointments/${id}`),
  book: (payload: BookAppointmentPayload) => api.post<AppointmentDetail>('/appointments', payload),
  cancel: (id: string, payload: CancelAppointmentPayload = {}) => api.post<AppointmentDetail>(`/appointments/${id}/cancel`, payload),
  reschedule: (id: string, payload: RescheduleAppointmentPayload) => api.post<AppointmentDetail>(`/appointments/${id}/reschedule`, payload),
  updateStatus: (id: string, payload: UpdateAppointmentStatusPayload) => api.post<AppointmentDetail>(`/appointments/${id}/status`, payload),
};

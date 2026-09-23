import type {
  DoctorAvailabilityState,
  DoctorAvailabilityWindowInput,
  DoctorBlockedDateRecord,
  DoctorDashboard,
  DoctorPatientDetail,
  DoctorPatientSummary,
  DoctorProfile,
  UpdateDoctorProfilePayload,
} from '@carebridge/shared';
import { api } from './client';

export interface ListMyPatientsParams {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: 'recent' | 'name';
}

export const doctorPortalApi = {
  getProfile: () => api.get<DoctorProfile>('/doctors/me'),
  updateProfile: (payload: UpdateDoctorProfilePayload) => api.patch<DoctorProfile>('/doctors/me', payload),

  getAvailability: () => api.get<DoctorAvailabilityState>('/doctors/me/availability'),
  replaceAvailability: (windows: DoctorAvailabilityWindowInput[]) => api.put<DoctorAvailabilityState>('/doctors/me/availability', { windows }),
  addBlockedDate: (payload: { date: string; reason?: string }) => api.post<DoctorBlockedDateRecord>('/doctors/me/blocked-dates', payload),
  removeBlockedDate: (id: string) => api.del<{ id: string }>(`/doctors/me/blocked-dates/${id}`),

  getDashboard: () => api.get<DoctorDashboard>('/doctors/me/dashboard'),

  listPatients: (params: ListMyPatientsParams = {}) => api.getPaginated<DoctorPatientSummary>('/doctors/me/patients', { params }),
  getPatient: (patientId: string) => api.get<DoctorPatientDetail>(`/doctors/me/patients/${patientId}`),
};

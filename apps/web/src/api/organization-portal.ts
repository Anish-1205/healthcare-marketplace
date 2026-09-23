import type {
  AssociateDoctorPayload, CreateOrganizationStaffPayload, OrganizationDashboard, OrganizationDoctor,
  OrganizationPatient, OrganizationPortalProfile, OrganizationReport, OrganizationScheduleWindow,
  OrganizationScheduleWindowInput, OrganizationServiceRecord, OrganizationStaffMember,
  SaveOrganizationServicePayload, UpdateOrganizationDoctorPayload, UpdateOrganizationProfilePayload,
  UpdateOrganizationStaffPayload,
} from '@carebridge/shared';
import { api } from './client';

export const organizationPortalApi = {
  profile: () => api.get<OrganizationPortalProfile>('/organizations/me'),
  updateProfile: (payload: UpdateOrganizationProfilePayload) => api.patch<OrganizationPortalProfile>('/organizations/me', payload),
  dashboard: () => api.get<OrganizationDashboard>('/organizations/me/dashboard'),
  doctors: () => api.get<OrganizationDoctor[]>('/organizations/me/doctors'),
  associateDoctor: (payload: AssociateDoctorPayload) => api.post<OrganizationDoctor>('/organizations/me/doctors', payload),
  updateDoctor: (id: string, payload: UpdateOrganizationDoctorPayload) => api.patch<OrganizationDoctor>(`/organizations/me/doctors/${id}`, payload),
  staff: () => api.get<OrganizationStaffMember[]>('/organizations/me/staff'),
  createStaff: (payload: CreateOrganizationStaffPayload) => api.post<OrganizationStaffMember>('/organizations/me/staff', payload),
  updateStaff: (id: string, payload: UpdateOrganizationStaffPayload) => api.patch<OrganizationStaffMember>(`/organizations/me/staff/${id}`, payload),
  services: () => api.get<OrganizationServiceRecord[]>('/organizations/me/services'),
  createService: (payload: SaveOrganizationServicePayload) => api.post<OrganizationServiceRecord>('/organizations/me/services', payload),
  updateService: (id: string, payload: SaveOrganizationServicePayload) => api.patch<OrganizationServiceRecord>(`/organizations/me/services/${id}`, payload),
  patients: () => api.get<OrganizationPatient[]>('/organizations/me/patients'),
  schedules: () => api.get<OrganizationScheduleWindow[]>('/organizations/me/schedules'),
  replaceSchedule: (doctorId: string, windows: OrganizationScheduleWindowInput[]) => api.put<OrganizationScheduleWindow[]>(`/organizations/me/doctors/${doctorId}/schedule`, { windows }),
  report: (from?: string, to?: string) => api.get<OrganizationReport>('/organizations/me/reports', { params: { from, to } }),
};

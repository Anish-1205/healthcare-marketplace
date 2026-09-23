import type {
  AdminActivity, AdminAppointment, AdminApproval, AdminDoctor, AdminEmployee, AdminOrder, AdminOrganization,
  AdminOverview, AdminPatient, AdminReport, AdminSetting, ApprovalStatus, AppointmentStatus,
  CreateAdminEmployeePayload, CreateAdminOrganizationPayload, OrderStatus, OrganizationType,
  UpdateAdminEmployeePayload,
} from '@carebridge/shared';
import { api } from './client';

export interface AdminListParams { page?: number; pageSize?: number; q?: string; }
export const adminApi = {
  overview: () => api.get<AdminOverview>('/admin/overview'),
  organizations: (params: AdminListParams & { type?: OrganizationType; approvalStatus?: ApprovalStatus; isActive?: boolean } = {}) => api.getPaginated<AdminOrganization>('/admin/organizations', { params }),
  organization: (id: string) => api.get<AdminOrganization>(`/admin/organizations/${id}`),
  createOrganization: (payload: CreateAdminOrganizationPayload) => api.post<AdminOrganization>('/admin/organizations', payload),
  setOrganizationActive: (id: string, isActive: boolean) => api.patch<AdminOrganization>(`/admin/organizations/${id}/status`, { isActive }),
  doctors: (params: AdminListParams & { approvalStatus?: ApprovalStatus; isActive?: boolean } = {}) => api.getPaginated<AdminDoctor>('/admin/doctors', { params }),
  doctor: (id: string) => api.get<AdminDoctor>(`/admin/doctors/${id}`),
  setDoctorActive: (id: string, isActive: boolean) => api.patch<AdminDoctor>(`/admin/doctors/${id}/status`, { isActive }),
  patients: (params: AdminListParams & { status?: string } = {}) => api.getPaginated<AdminPatient>('/admin/patients', { params }),
  patient: (id: string) => api.get<AdminPatient>(`/admin/patients/${id}`),
  setUserStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') => api.patch<{ id: string; status: string }>(`/admin/users/${id}/status`, { status }),
  appointments: (params: AdminListParams & { status?: AppointmentStatus; consultationType?: string; from?: string; to?: string } = {}) => api.getPaginated<AdminAppointment>('/admin/appointments', { params }),
  orders: (params: AdminListParams & { status?: OrderStatus; pharmacyId?: string; from?: string; to?: string } = {}) => api.getPaginated<AdminOrder>('/admin/orders', { params }),
  approvals: () => api.get<AdminApproval[]>('/admin/approvals'),
  decideApproval: (type: 'doctor' | 'organization', id: string, decision: 'approve' | 'reject', reason?: string) => api.post<AdminDoctor | AdminOrganization>(`/admin/approvals/${type}/${id}/${decision}`, reason ? { reason } : {}),
  employees: (params: AdminListParams = {}) => api.getPaginated<AdminEmployee>('/admin/employees', { params }),
  createEmployee: (payload: CreateAdminEmployeePayload) => api.post<AdminEmployee>('/admin/employees', payload),
  updateEmployee: (id: string, payload: UpdateAdminEmployeePayload) => api.patch<AdminEmployee>(`/admin/employees/${id}`, payload),
  report: (from?: string, to?: string) => api.get<AdminReport>('/admin/reports', { params: { from, to } }),
  activity: (params: AdminListParams & { action?: string; entityType?: string; from?: string; to?: string } = {}) => api.getPaginated<AdminActivity>('/admin/activity', { params }),
  settings: () => api.get<AdminSetting[]>('/admin/settings'),
  updateSettings: (settings: Array<{ key: string; value: string }>) => api.patch<AdminSetting[]>('/admin/settings', { settings }),
};

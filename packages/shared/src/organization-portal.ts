import type { AppointmentStatus, ConsultationType, OrganizationType } from './statuses';

export interface OrganizationPortalProfile {
  id: string;
  type: OrganizationType;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  locality: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  opensAt: string | null;
  closesAt: string | null;
  is24Hours: boolean;
  openDays: number[];
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  isActive: boolean;
}

export type UpdateOrganizationProfilePayload = Partial<Pick<OrganizationPortalProfile,
  'name' | 'category' | 'description' | 'logoUrl' | 'phone' | 'email' | 'website' |
  'addressLine1' | 'addressLine2' | 'locality' | 'city' | 'state' | 'postalCode' |
  'opensAt' | 'closesAt' | 'is24Hours' | 'openDays'>>;

export interface OrganizationDoctor {
  linkId: string;
  doctorId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  qualifications: string;
  specialties: string[];
  title: string | null;
  consultationFee: number;
  isPrimary: boolean;
  isActive: boolean;
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
}

export interface OrganizationStaffMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  staffRole: 'ADMIN' | 'STAFF';
  title: string | null;
  joinedAt: string;
  isActive: boolean;
}

export interface OrganizationServiceRecord {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  durationMinutes: number | null;
  specialtyId: string | null;
  specialtyName: string | null;
  isActive: boolean;
}

export interface OrganizationPatient {
  patientId: string;
  name: string;
  avatarUrl: string | null;
  age: number | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNDISCLOSED' | null;
  phone: string | null;
  totalVisits: number;
  lastVisitAt: string | null;
  nextAppointmentAt: string | null;
}

export interface OrganizationScheduleWindow {
  id: string;
  doctorId: string;
  doctorName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStartTime: string | null;
  breakEndTime: string | null;
  slotDurationMinutes: number;
  consultationTypes: ConsultationType[];
  isActive: boolean;
}

export interface OrganizationDashboard {
  organization: Pick<OrganizationPortalProfile, 'id' | 'name' | 'type' | 'approvalStatus'>;
  stats: {
    todayAppointments: number;
    activeDoctors: number;
    totalPatients: number;
    completedConsultations: number;
    revenue: number;
  };
  todayAppointments: Array<{
    id: string;
    appointmentNumber: string;
    scheduledStart: string;
    status: AppointmentStatus;
    consultationType: ConsultationType;
    patientName: string;
    doctorName: string;
  }>;
  doctorAvailability: Array<{ doctorId: string; doctorName: string; status: 'AVAILABLE' | 'OFF_DUTY'; hours: string | null }>;
  appointmentTrend: Array<{ label: string; total: number }>;
}

export interface OrganizationReport {
  period: { from: string; to: string };
  totals: { appointments: number; completed: number; cancelled: number; noShows: number; revenue: number };
  appointmentTrend: Array<{ label: string; total: number; completed: number }>;
  doctorPerformance: Array<{ doctorId: string; doctorName: string; appointments: number; completed: number; revenue: number }>;
}

export interface AssociateDoctorPayload { email: string; title?: string | null; consultationFee?: number | null; isPrimary?: boolean; }
export interface UpdateOrganizationDoctorPayload { title?: string | null; consultationFee?: number | null; isPrimary?: boolean; isActive?: boolean; }
export interface CreateOrganizationStaffPayload { email: string; firstName: string; lastName: string; phone?: string | null; title?: string | null; staffRole?: 'ADMIN' | 'STAFF'; password?: string; }
export interface UpdateOrganizationStaffPayload { title?: string | null; staffRole?: 'ADMIN' | 'STAFF'; isActive?: boolean; }
export interface SaveOrganizationServicePayload { name: string; description?: string | null; price?: number | null; durationMinutes?: number | null; specialtyId?: string | null; isActive?: boolean; }
export interface OrganizationScheduleWindowInput { dayOfWeek: number; startTime: string; endTime: string; breakStartTime?: string | null; breakEndTime?: string | null; slotDurationMinutes: number; consultationTypes: ConsultationType[]; }

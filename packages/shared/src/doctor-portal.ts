import type { ApprovalStatus, AppointmentStatus, ConsultationType } from './statuses';
import type { AppointmentSummary } from './appointments';
import type { DoctorOrganizationLink, Gender, ReviewSummary } from './catalog';

/**
 * Doctor-side statuses a doctor or clinic staff may move an appointment to directly.
 * PENDING -> CONFIRMED, CONFIRMED/CHECKED_IN -> CHECKED_IN/NO_SHOW.
 * Starting/completing a consultation (IN_CONSULTATION, COMPLETED) happens through the
 * consultation workspace (phase 10), not this generic status endpoint.
 */
export const DOCTOR_SETTABLE_STATUSES = ['CONFIRMED', 'CHECKED_IN', 'NO_SHOW'] as const;
export type DoctorSettableStatus = (typeof DOCTOR_SETTABLE_STATUSES)[number];

export interface UpdateAppointmentStatusPayload {
  status: DoctorSettableStatus;
  note?: string;
}

/** The signed-in doctor's own profile — includes fields not shown on the public listing. */
export interface DoctorProfile {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  bio: string | null;
  qualifications: string;
  registrationNumber: string;
  experienceYears: number;
  gender: Gender | null;
  languages: string[];
  specialties: Array<{ id: string; name: string; slug: string; isPrimary: boolean }>;
  consultationFee: number;
  consultationTypes: ConsultationType[];
  slotDurationMinutes: number;
  avgRating: number;
  reviewCount: number;
  approvalStatus: ApprovalStatus;
  rejectionReason: string | null;
  isActive: boolean;
  organizations: DoctorOrganizationLink[];
}

export interface UpdateDoctorProfilePayload {
  bio?: string | null;
  qualifications?: string;
  experienceYears?: number;
  languages?: string[];
  specialties?: string[]; // specialty slugs; first is primary
  consultationFee?: number;
  consultationTypes?: ConsultationType[];
  avatarUrl?: string | null;
}

export interface DoctorAvailabilityWindowRecord {
  id: string;
  organizationId: string | null;
  organizationName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStartTime: string | null;
  breakEndTime: string | null;
  slotDurationMinutes: number;
  consultationTypes: ConsultationType[];
  isActive: boolean;
}

export interface DoctorAvailabilityWindowInput {
  organizationId?: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  slotDurationMinutes: number;
  consultationTypes: ConsultationType[];
}

export interface DoctorBlockedDateRecord {
  id: string;
  date: string; // YYYY-MM-DD
  reason: string | null;
}

export interface DoctorAvailabilityState {
  windows: DoctorAvailabilityWindowRecord[];
  blockedDates: DoctorBlockedDateRecord[];
}

export interface DoctorDashboard {
  stats: {
    todayAppointments: number;
    upcomingAppointments: number;
    waitingPatients: number;
    completedConsultationsToday: number;
    totalPatients: number;
    pendingNotes: number;
  };
  todaySchedule: AppointmentSummary[];
  upcomingAppointments: AppointmentSummary[];
  recentPatients: DoctorPatientSummary[];
}

export interface DoctorPatientSummary {
  patientId: string;
  name: string;
  avatarUrl: string | null;
  age: number | null;
  gender: Gender | null;
  totalVisits: number;
  lastVisitAt: string | null;
  nextAppointmentAt: string | null;
}

export interface DoctorPatientDetail extends DoctorPatientSummary {
  phone: string | null;
  bloodGroup: string | null;
  appointments: AppointmentSummary[];
}

export type ListDoctorPatientsSort = 'recent' | 'name';

/** Statuses excluded when computing "total patients ever seen" (never actually happened). */
export const NON_ENCOUNTER_STATUSES: readonly AppointmentStatus[] = ['CANCELLED'];

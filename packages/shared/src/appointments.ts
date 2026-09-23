import type { OrganizationType } from './statuses';
import type { AppointmentStatus, ConsultationType, PaymentMethod, PaymentStatus } from './statuses';

/** Payment methods offered when booking a consultation (no cash on delivery). */
export const APPOINTMENT_PAYMENT_METHODS = ['UPI', 'CARD', 'PAY_AT_CLINIC'] as const;
export type AppointmentPaymentMethod = (typeof APPOINTMENT_PAYMENT_METHODS)[number];

/** A patient may move the same appointment this many times before rebooking instead. */
export const MAX_RESCHEDULES = 3;

export interface AppointmentDoctorRef {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
  primarySpecialty: string;
  qualifications: string;
}

export interface AppointmentPatientRef {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface AppointmentOrganizationRef {
  id: string;
  slug: string;
  name: string;
  type: OrganizationType;
  locality: string | null;
  addressLine1: string | null;
  city: string | null;
  phone: string | null;
}

export interface AppointmentPaymentSummary {
  id: string;
  transactionRef: string;
  amount: number;
  method: PaymentMethod;
  methodDetail: string | null;
  status: PaymentStatus;
  paidAt: string | null;
  refundedAt: string | null;
}

export interface AppointmentSummary {
  id: string;
  appointmentNumber: string;
  status: AppointmentStatus;
  consultationType: ConsultationType;
  scheduledStart: string;
  scheduledEnd: string;
  fee: number;
  reason: string | null;
  doctor: AppointmentDoctorRef;
  patient: AppointmentPatientRef;
  organization: AppointmentOrganizationRef | null;
  payment: AppointmentPaymentSummary | null;
  /** Derived server-side so every portal shows the same actions. */
  canCancel: boolean;
  canReschedule: boolean;
}

export interface AppointmentStatusEvent {
  id: string;
  fromStatus: AppointmentStatus | null;
  toStatus: AppointmentStatus;
  note: string | null;
  createdAt: string;
}

export interface AppointmentDetail extends AppointmentSummary {
  patientNotes: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  checkedInAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  rescheduleCount: number;
  createdAt: string;
  statusHistory: AppointmentStatusEvent[];
  /** Set once a consultation has been started by the doctor (phase 10). */
  consultationId: string | null;
}

export interface BookAppointmentPayload {
  doctorId: string;
  organizationId?: string | null;
  consultationType: ConsultationType;
  /** ISO datetime of an available slot start, exactly as returned by `/doctors/:id/slots`. */
  scheduledStart: string;
  reason?: string;
  patientNotes?: string;
  paymentMethod: AppointmentPaymentMethod;
}

export interface RescheduleAppointmentPayload {
  scheduledStart: string;
  organizationId?: string | null;
  consultationType?: ConsultationType;
}

export interface CancelAppointmentPayload {
  reason?: string;
}

export type AppointmentScope = 'upcoming' | 'past' | 'all';

/** Statuses that still expect the patient to turn up. */
export const ACTIVE_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_CONSULTATION',
];

// Display labels live in the frontend (`apps/web/src/lib/appointment-labels.ts`);
// this package stays the API contract.

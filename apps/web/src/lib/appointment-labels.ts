import type { AppointmentStatus, ConsultationType } from '@carebridge/shared';

/** Patient-facing wording for appointment statuses and consultation types. */
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Pending confirmation',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked in',
  IN_CONSULTATION: 'In consultation',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No show',
};

export const CONSULTATION_TYPE_LABELS: Record<ConsultationType, string> = {
  IN_PERSON: 'In person',
  VIDEO: 'Video consultation',
  PHONE: 'Phone consultation',
};

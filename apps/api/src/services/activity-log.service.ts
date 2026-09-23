import type { Prisma } from '@prisma/client';
import { prisma, type Tx } from '../config/prisma';

/** Canonical activity actions. Stored as strings so new actions don't need a migration. */
export const ACTIVITY = {
  PATIENT_REGISTERED: 'patient.registered',
  USER_LOGGED_IN: 'user.logged_in',
  USER_LOGGED_OUT: 'user.logged_out',
  PASSWORD_RESET_REQUESTED: 'user.password_reset_requested',
  PASSWORD_RESET_COMPLETED: 'user.password_reset_completed',
  DOCTOR_REGISTERED: 'doctor.registered',
  DOCTOR_APPROVED: 'doctor.approved',
  DOCTOR_REJECTED: 'doctor.rejected',
  ORGANIZATION_REGISTERED: 'organization.registered',
  ORGANIZATION_APPROVED: 'organization.approved',
  ORGANIZATION_REJECTED: 'organization.rejected',
  APPOINTMENT_BOOKED: 'appointment.booked',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_RESCHEDULED: 'appointment.rescheduled',
  APPOINTMENT_STATUS_UPDATED: 'appointment.status_updated',
  CONSULTATION_STARTED: 'consultation.started',
  CONSULTATION_COMPLETED: 'consultation.completed',
  PRESCRIPTION_ISSUED: 'prescription.issued',
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_UPDATED: 'order.status_updated',
  ORDER_ACCEPTED: 'order.accepted',
  ORDER_REJECTED: 'order.rejected',
  ORDER_DISPATCHED: 'order.dispatched',
  ORDER_DELIVERED: 'order.delivered',
  LAB_BOOKING_CREATED: 'lab_booking.created',
  REVIEW_SUBMITTED: 'review.submitted',
  USER_STATUS_UPDATED: 'admin.user_status_updated',
  ENTITY_STATUS_UPDATED: 'admin.entity_status_updated',
  EMPLOYEE_CREATED: 'admin.employee_created',
  EMPLOYEE_UPDATED: 'admin.employee_updated',
  SETTINGS_UPDATED: 'admin.settings_updated',
  DEMO_DATA_RESET: 'demo.reset',
} as const;

export type ActivityAction = (typeof ACTIVITY)[keyof typeof ACTIVITY];

export interface ActivityInput {
  action: ActivityAction;
  entityType: string;
  entityId?: string | null;
  description: string;
  actorUserId?: string | null;
  organizationId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

/** Record an activity. Pass the transaction client when the log must commit with the change. */
export async function logActivity(input: ActivityInput, tx: Tx = prisma) {
  await tx.activityLog.create({ data: input });
}

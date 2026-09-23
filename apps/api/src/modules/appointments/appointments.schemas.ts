import { z } from 'zod';
import { APPOINTMENT_PAYMENT_METHODS, APPOINTMENT_STATUSES, CONSULTATION_TYPES, DOCTOR_SETTABLE_STATUSES } from '@carebridge/shared';
import { paginationQuery } from '../../utils/http';
import { csvQuery, sortQuery } from '../../utils/query';

export const bookAppointmentSchema = z.object({
  doctorId: z.uuid(),
  organizationId: z.uuid().nullish(),
  consultationType: z.enum(CONSULTATION_TYPES),
  scheduledStart: z.iso.datetime('Pick one of the offered appointment slots.'),
  reason: z.string().trim().min(1).max(500).optional(),
  patientNotes: z.string().trim().min(1).max(1000).optional(),
  paymentMethod: z.enum(APPOINTMENT_PAYMENT_METHODS),
});

export const rescheduleAppointmentSchema = z.object({
  scheduledStart: z.iso.datetime('Pick one of the offered appointment slots.'),
  organizationId: z.uuid().nullish(),
  consultationType: z.enum(CONSULTATION_TYPES).optional(),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().min(1).max(300).optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(DOCTOR_SETTABLE_STATUSES),
  note: z.string().trim().min(1).max(300).optional(),
});

export const listAppointmentsQuery = paginationQuery.extend({
  scope: z.enum(['upcoming', 'past', 'all']).default('all'),
  status: csvQuery(z.enum(APPOINTMENT_STATUSES)).optional(),
  doctorId: z.uuid().optional(),
  sort: sortQuery(['scheduledStart', 'createdAt'] as const, '-scheduledStart'),
});

export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuery>;

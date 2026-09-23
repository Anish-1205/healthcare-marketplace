import { CONSULTATION_TYPES } from '@carebridge/shared';
import { z } from 'zod';

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm time format.');

export const organizationQuery = z.object({ organizationId: z.uuid().optional() });

export const updateOrganizationProfileSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  category: nullableText(100), description: nullableText(2000), logoUrl: z.url().nullable().optional(),
  phone: nullableText(30), email: z.email().nullable().optional(), website: z.url().nullable().optional(),
  addressLine1: nullableText(200), addressLine2: nullableText(200), locality: nullableText(100),
  city: nullableText(100), state: nullableText(100), postalCode: nullableText(20),
  opensAt: time.nullable().optional(), closesAt: time.nullable().optional(),
  is24Hours: z.boolean().optional(), openDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
});

export const associateDoctorSchema = z.object({
  email: z.email(), title: nullableText(100), consultationFee: z.number().min(0).max(100000).nullable().optional(), isPrimary: z.boolean().optional(),
});
export const updateDoctorLinkSchema = associateDoctorSchema.omit({ email: true }).extend({ isActive: z.boolean().optional() });

export const createStaffSchema = z.object({
  email: z.email(), firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80),
  phone: nullableText(30), title: nullableText(100), staffRole: z.enum(['ADMIN', 'STAFF']).default('STAFF'),
  password: z.string().min(8).max(100).optional(),
});
export const updateStaffSchema = z.object({ title: nullableText(100), staffRole: z.enum(['ADMIN', 'STAFF']).optional(), isActive: z.boolean().optional() });

export const saveServiceSchema = z.object({
  name: z.string().trim().min(2).max(120), description: nullableText(1000), price: z.number().min(0).max(100000).nullable().optional(),
  durationMinutes: z.number().int().min(5).max(600).nullable().optional(), specialtyId: z.uuid().nullable().optional(), isActive: z.boolean().optional(),
});

export const scheduleWindowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6), startTime: time, endTime: time,
  breakStartTime: time.nullable().optional(), breakEndTime: time.nullable().optional(),
  slotDurationMinutes: z.number().int().min(5).max(180), consultationTypes: z.array(z.enum(CONSULTATION_TYPES)).min(1),
});
export const replaceDoctorScheduleSchema = z.object({ windows: z.array(scheduleWindowSchema).max(21) });

export const reportQuerySchema = organizationQuery.extend({
  from: z.iso.date().optional(), to: z.iso.date().optional(),
});

export type UpdateOrganizationProfileInput = z.infer<typeof updateOrganizationProfileSchema>;
export type AssociateDoctorInput = z.infer<typeof associateDoctorSchema>;
export type UpdateDoctorLinkInput = z.infer<typeof updateDoctorLinkSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type SaveServiceInput = z.infer<typeof saveServiceSchema>;
export type ScheduleWindowInput = z.infer<typeof scheduleWindowSchema>;

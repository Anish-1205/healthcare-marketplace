import { z } from 'zod';
import { CONSULTATION_TYPES } from '@carebridge/shared';
import { paginationQuery } from '../../utils/http';

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm format.');

export const updateDoctorProfileSchema = z.object({
  bio: z.string().trim().max(2000).nullable().optional(),
  qualifications: z.string().trim().min(2).max(150).optional(),
  experienceYears: z.number().int().min(0).max(60).optional(),
  languages: z.array(z.string().trim().min(2).max(30)).min(1).max(8).optional(),
  specialties: z.array(z.string().trim().min(1)).min(1).max(3).optional(),
  consultationFee: z.number().min(0).max(20_000).optional(),
  consultationTypes: z.array(z.enum(CONSULTATION_TYPES)).min(1).optional(),
  avatarUrl: z.url().max(500).nullable().optional(),
});

const availabilityWindowSchema = z
  .object({
    organizationId: z.uuid().nullish(),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeString,
    endTime: timeString,
    breakStartTime: timeString.nullish(),
    breakEndTime: timeString.nullish(),
    slotDurationMinutes: z.number().int().min(5).max(120),
    consultationTypes: z.array(z.enum(CONSULTATION_TYPES)).min(1),
  })
  .refine((value) => value.startTime < value.endTime, { message: 'Closing time must be after opening time.', path: ['endTime'] })
  .refine((value) => !value.breakStartTime || !value.breakEndTime || value.breakStartTime < value.breakEndTime, {
    message: 'Break end must be after break start.',
    path: ['breakEndTime'],
  });

export const replaceAvailabilitySchema = z.object({
  windows: z.array(availabilityWindowSchema).max(50),
});

export const blockedDateSchema = z.object({
  date: z.iso.date('Use the format YYYY-MM-DD.'),
  reason: z.string().trim().min(1).max(200).optional(),
});

export const listMyPatientsQuery = paginationQuery.extend({
  q: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(['recent', 'name']).default('recent'),
});

export type UpdateDoctorProfileInput = z.infer<typeof updateDoctorProfileSchema>;
export type ReplaceAvailabilityInput = z.infer<typeof replaceAvailabilitySchema>;
export type AvailabilityWindowInput = z.infer<typeof availabilityWindowSchema>;
export type BlockedDateInput = z.infer<typeof blockedDateSchema>;
export type ListMyPatientsQuery = z.infer<typeof listMyPatientsQuery>;

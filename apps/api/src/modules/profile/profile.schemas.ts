import { z } from 'zod';
import { personNameSchema, phoneSchema } from '../auth/auth.schemas';

/** Optional free text: blank clears the field (null), omitted leaves it unchanged. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value === undefined ? undefined : value || null));

const optionalPhone = z
  .union([z.literal(''), phoneSchema])
  .nullable()
  .optional()
  .transform((value) => (value === undefined ? undefined : value || null));

export const updateProfileSchema = z
  .object({
    firstName: personNameSchema.optional(),
    lastName: personNameSchema.optional(),
    phone: optionalPhone,
    // http(s) URLs or root-relative demo assets only — never javascript:/data: URIs.
    avatarUrl: z
      .string()
      .trim()
      .max(500)
      .refine((value) => value === '' || /^(https?:\/\/|\/(?!\/))/.test(value), 'Use an http(s) image URL.')
      .nullable()
      .optional()
      .transform((value) => (value === undefined ? undefined : value || null)),
    dateOfBirth: z.iso
      .date('Use the format YYYY-MM-DD.')
      .refine((value) => new Date(value) < new Date(), 'Date of birth must be in the past.')
      .nullable()
      .optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED']).nullable().optional(),
    emergencyContactName: optionalText(100),
    emergencyContactPhone: optionalPhone,
    emergencyContactRelation: optionalText(50),
  })
  .strict();

export const addressSchema = z
  .object({
    label: z.string().trim().min(1).max(40),
    recipient: z.string().trim().min(1).max(100),
    phone: phoneSchema,
    line1: z.string().trim().min(1).max(200),
    line2: optionalText(200),
    landmark: optionalText(200),
    locality: z.string().trim().min(1).max(100),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    postalCode: z.string().trim().regex(/^\d{6}$/, 'Enter a 6-digit PIN code.'),
    isDefault: z.boolean().optional(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddressInput = z.infer<typeof addressSchema>;

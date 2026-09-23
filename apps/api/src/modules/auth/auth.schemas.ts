import { z } from 'zod';

export const emailSchema = z
  .email('Enter a valid email address.')
  .max(254)
  .transform((value) => value.trim().toLowerCase());
const email = emailSchema;

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number.');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be at most 128 characters.')
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[0-9]/, 'Password must contain a number.');

export const personNameSchema = z.string().trim().min(1).max(60);
const name = personNameSchema;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.').max(128),
});

export const registerPatientSchema = z.object({
  email,
  password: passwordSchema,
  firstName: name,
  lastName: name,
  phone: phoneSchema.optional(),
  dateOfBirth: z.iso
    .date('Use the format YYYY-MM-DD.')
    .refine((value) => new Date(value) < new Date(), 'Date of birth must be in the past.')
    .optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED']).optional(),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

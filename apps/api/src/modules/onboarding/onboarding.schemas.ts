import { z } from 'zod';
import { CONSULTATION_TYPES } from '@carebridge/shared';
import { mockDocumentSchema } from '../../services/document.service';
import { emailSchema, passwordSchema, personNameSchema, phoneSchema } from '../auth/auth.schemas';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm format.');

const registrationDocument = mockDocumentSchema.extend({
  type: z.enum(['REGISTRATION_CERTIFICATE', 'LICENSE', 'ID_PROOF', 'OTHER']),
});

/** The person creating the account (becomes the doctor, or the organization's first admin). */
const account = {
  email: emailSchema,
  password: passwordSchema,
  firstName: personNameSchema,
  lastName: personNameSchema,
  phone: phoneSchema,
};

export const doctorOnboardingSchema = z.object({
  ...account,
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED']).optional(),
  specialties: z.array(z.string().trim().min(1)).min(1, 'Choose at least one specialty.').max(3),
  qualifications: z.string().trim().min(2).max(150),
  experienceYears: z.number().int().min(0).max(60),
  registrationNumber: z.string().trim().min(4).max(40),
  consultationFee: z.number().min(0).max(20_000),
  languages: z.array(z.string().trim().min(2).max(30)).min(1).max(8),
  consultationTypes: z.array(z.enum(CONSULTATION_TYPES)).min(1),
  bio: z.string().trim().max(2000).optional(),
  documents: z.array(registrationDocument).max(5).default([]),
});

export const organizationOnboardingSchema = z
  .object({
    ...account,
    organizationType: z.enum(['CLINIC', 'HOSPITAL', 'PHARMACY']),
    organizationName: z.string().trim().min(3).max(120),
    category: z.string().trim().max(80).optional(),
    description: z.string().trim().max(2000).optional(),
    businessPhone: phoneSchema,
    businessEmail: emailSchema,
    registrationNumber: z.string().trim().min(4).max(40),
    licenseNumber: z.string().trim().max(40).optional(),
    address: z.object({
      line1: z.string().trim().min(3).max(150),
      line2: z.string().trim().max(150).optional(),
      locality: z.string().trim().min(2).max(80),
      city: z.string().trim().min(2).max(80),
      state: z.string().trim().min(2).max(80),
      postalCode: z.string().trim().regex(/^\d{6}$/, 'Enter a 6-digit PIN code.'),
    }),
    opensAt: time.optional(),
    closesAt: time.optional(),
    is24Hours: z.boolean().default(false),
    pharmacy: z
      .object({
        deliveryAvailable: z.boolean().default(true),
        pickupAvailable: z.boolean().default(true),
      })
      .optional(),
    documents: z.array(registrationDocument).max(5).default([]),
  })
  .refine((value) => value.is24Hours || !value.opensAt || !value.closesAt || value.opensAt < value.closesAt, {
    message: 'Closing time must be after opening time.',
    path: ['closesAt'],
  });

export type DoctorOnboardingInput = z.infer<typeof doctorOnboardingSchema>;
export type OrganizationOnboardingInput = z.infer<typeof organizationOnboardingSchema>;

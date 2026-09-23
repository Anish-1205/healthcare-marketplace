import { z } from 'zod';
import { PRESCRIPTION_STATUSES } from '@carebridge/shared';
import { paginationQuery } from '../../utils/http';
import { csvQuery } from '../../utils/query';

/**
 * Every dosage field is free text the doctor types. The API validates length only —
 * it never fills in, suggests or derives dosage, frequency, timing or instructions.
 */
export const prescriptionItemSchema = z.object({
  medicineId: z.uuid().nullish(),
  medicineName: z.string().trim().min(2).max(150),
  dosage: z.string().trim().min(1).max(120),
  frequency: z.string().trim().min(1).max(120),
  duration: z.string().trim().min(1).max(120),
  timing: z.string().trim().max(120).nullish(),
  instructions: z.string().trim().max(300).nullish(),
  quantity: z.number().int().min(1).max(100).default(1),
});

export const createPrescriptionSchema = z
  .object({
    consultationId: z.uuid().nullish(),
    patientId: z.uuid().optional(),
    diagnosis: z.string().trim().max(1000).nullish(),
    advice: z.string().trim().max(2000).nullish(),
    validUntil: z.iso.date('Use the format YYYY-MM-DD.').nullish(),
    items: z.array(prescriptionItemSchema).min(1, 'Add at least one medicine.').max(20),
  })
  .refine((value) => value.consultationId || value.patientId, {
    message: 'A prescription needs either a consultation or a patient.',
    path: ['patientId'],
  });

export const updatePrescriptionSchema = z.object({
  diagnosis: z.string().trim().max(1000).nullish(),
  advice: z.string().trim().max(2000).nullish(),
  validUntil: z.iso.date('Use the format YYYY-MM-DD.').nullish(),
  items: z.array(prescriptionItemSchema).min(1).max(20).optional(),
});

export const listPrescriptionsQuery = paginationQuery.extend({
  status: csvQuery(z.enum(PRESCRIPTION_STATUSES)).optional(),
  patientId: z.uuid().optional(),
  consultationId: z.uuid().optional(),
});

export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;
export type ListPrescriptionsQuery = z.infer<typeof listPrescriptionsQuery>;

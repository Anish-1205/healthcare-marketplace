import { z } from 'zod';

export const addCartItemSchema = z.object({
  medicineId: z.uuid(),
  pharmacyId: z.uuid(),
  quantity: z.number().int().min(1).max(50).default(1),
  replace: z.boolean().default(false),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(50),
});

export const cartFromPrescriptionSchema = z.object({
  prescriptionId: z.uuid(),
  pharmacyId: z.uuid(),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type CartFromPrescriptionInput = z.infer<typeof cartFromPrescriptionSchema>;

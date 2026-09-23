import { z } from 'zod';
import { ORDER_STATUSES } from '@carebridge/shared';
import { paginationQuery } from '../../utils/http';

const address = z.object({
  recipient: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(7).max(30),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  locality: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(100),
  postalCode: z.string().regex(/^\d{6}$/),
});
export const checkoutSchema = z
  .object({
    fulfillmentType: z.enum(['DELIVERY', 'PICKUP']),
    paymentMethod: z.enum(['CARD', 'UPI', 'CASH_ON_DELIVERY']),
    addressId: z.uuid().optional(),
    address: address.optional(),
    prescriptionId: z.uuid().optional(),
    patientNotes: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.fulfillmentType !== 'DELIVERY' || v.addressId || v.address, 'A delivery address is required.');
export const listOrdersSchema = paginationQuery.extend({ status: z.enum(ORDER_STATUSES).optional() });
export const statusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(1000).optional(),
  items: z
    .array(z.object({ id: z.uuid(), approvedQuantity: z.number().int().min(0), unitPrice: z.number().min(0).max(999999).multipleOf(0.01) }))
    .min(1)
    .max(100)
    .optional(),
});
export const cancelSchema = z.object({ note: z.string().trim().max(1000).optional() });
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type StatusInput = z.infer<typeof statusSchema>;

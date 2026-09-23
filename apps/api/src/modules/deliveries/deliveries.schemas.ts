import { z } from 'zod';
export const deliveryStatusSchema = z.object({ status: z.enum(['PICKED_UP', 'ON_THE_WAY', 'DELIVERED']) });
export const assignDeliverySchema = z.object({ etaMinutes: z.number().int().min(5).max(180).default(30) });

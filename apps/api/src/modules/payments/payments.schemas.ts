import { z } from 'zod';
export const simulatePaymentSchema = z.object({ orderId: z.uuid() });

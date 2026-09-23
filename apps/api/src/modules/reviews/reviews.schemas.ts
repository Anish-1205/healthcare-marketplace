import { z } from 'zod';

export const targetSchema = z.object({
  targetType: z.enum(['DOCTOR', 'ORGANIZATION', 'CLINIC', 'HOSPITAL', 'PHARMACY']),
  targetId: z.string().uuid(),
}).strict();
export type Target = z.infer<typeof targetSchema>;
export const createReviewSchema = targetSchema.extend({ rating: z.number().int().min(1).max(5), text: z.string().trim().min(1).max(4000) });
export const reviewListSchema = z.object({
  targetType: targetSchema.shape.targetType.optional(), targetId: z.string().uuid().optional(),
  mine: z.enum(['true', 'false']).default('false'),
}).strict().refine((q) => Boolean(q.targetType) === Boolean(q.targetId), 'Supply both targetType and targetId.');

import type { Response } from 'express';
import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type PaginationMeta } from '@carebridge/shared';
import { badRequest } from './errors';

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function created<T>(res: Response, data: T) {
  return ok(res, data, 201);
}

export function paginated<T>(res: Response, data: T[], page: number, pageSize: number, total: number) {
  const meta: PaginationMeta = { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  return res.status(200).json({ success: true, data, meta });
}

/** Parse and validate input with a Zod schema; throws VALIDATION_ERROR (400) on failure. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw badRequest(
      'VALIDATION_ERROR',
      'Some of the submitted information is invalid.',
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
  return result.data;
}

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export function toSkipTake({ page, pageSize }: { page: number; pageSize: number }) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export const uuidParam = z.object({ id: z.uuid() });

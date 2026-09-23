import { z } from 'zod';

/** Query-string boolean: "true" | "false" | "1" | "0". */
export const booleanQuery = z.enum(['true', 'false', '1', '0']).transform((value) => value === 'true' || value === '1');

/** Free-text search term from a query string. */
export const searchText = z.string().trim().min(2, 'Enter at least 2 characters.').max(100);

export type SortDirection = 'asc' | 'desc';

/**
 * `?sort=field` (ascending) or `?sort=-field` (descending), restricted to an allow-list
 * so clients can never sort by arbitrary columns.
 */
export function sortQuery<const F extends string>(fields: readonly [F, ...F[]], fallback: F | `-${F}`) {
  const allowed = [...fields, ...fields.map((field) => `-${field}` as const)] as [string, ...string[]];
  return z
    .enum(allowed)
    .default(fallback)
    .transform((value) => {
      const direction: SortDirection = value.startsWith('-') ? 'desc' : 'asc';
      return { field: (direction === 'desc' ? value.slice(1) : value) as F, direction };
    });
}

/** Comma-separated list in a query string, e.g. `?types=VIDEO,PHONE`. */
export function csvQuery<T extends z.ZodType<unknown, string>>(item: T) {
  return z
    .string()
    .transform((value) => value.split(',').map((part) => part.trim()).filter(Boolean))
    .pipe(z.array(item));
}

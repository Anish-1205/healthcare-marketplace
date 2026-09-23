import { z } from 'zod';
import { CONSULTATION_TYPES } from '@carebridge/shared';
import { paginationQuery } from '../../utils/http';
import { csvQuery, sortQuery } from '../../utils/query';

export const listDoctorsQuery = paginationQuery.extend({
  q: z.string().trim().min(1).max(100).optional(),
  specialty: z.string().trim().min(1).max(80).optional(),
  organizationId: z.uuid().optional(),
  type: csvQuery(z.enum(CONSULTATION_TYPES)).optional(),
  feeMax: z.coerce.number().min(0).max(50_000).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  language: z.string().trim().min(1).max(30).optional(),
  locality: z.string().trim().min(1).max(80).optional(),
  sort: sortQuery(['rating', 'fee', 'experience', 'name'] as const, '-rating'),
});

export const slotsQuery = z.object({
  date: z.iso.date('Use the format YYYY-MM-DD.'),
});

export type ListDoctorsQuery = z.infer<typeof listDoctorsQuery>;

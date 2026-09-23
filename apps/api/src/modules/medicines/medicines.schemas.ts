import { z } from 'zod';
import { paginationQuery } from '../../utils/http';
import { booleanQuery, sortQuery } from '../../utils/query';

export const listMedicinesQuery = paginationQuery.extend({
  q: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  requiresPrescription: booleanQuery.optional(),
  /** Restrict to one pharmacy's stock and show that pharmacy's price ("shop this pharmacy"). */
  pharmacyId: z.uuid().optional(),
  sort: sortQuery(['name', 'mrp'] as const, 'name'),
});

export type ListMedicinesQuery = z.infer<typeof listMedicinesQuery>;

import { z } from 'zod';
import { ORGANIZATION_TYPES } from '@carebridge/shared';
import { paginationQuery } from '../../utils/http';
import { booleanQuery, csvQuery } from '../../utils/query';

export const listOrganizationsQuery = paginationQuery.extend({
  type: csvQuery(z.enum(ORGANIZATION_TYPES)).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  locality: z.string().trim().min(1).max(80).optional(),
  specialty: z.string().trim().min(1).max(80).optional(),
  deliveryAvailable: booleanQuery.optional(),
  acceptsPrescriptions: booleanQuery.optional(),
});

export const listPharmaciesQuery = listOrganizationsQuery.omit({ type: true });

export type ListOrganizationsQuery = z.infer<typeof listOrganizationsQuery>;

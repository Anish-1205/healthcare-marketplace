import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { canAccessOrganization } from '../src/services/tenant.service';
import type { AuthContext } from '../src/types/auth';
import { booleanQuery, csvQuery, sortQuery } from '../src/utils/query';
import { slugify } from '../src/utils/slug';

describe('query helpers', () => {
  const sort = sortQuery(['name', 'createdAt'], '-createdAt');

  it('parses ascending and descending sort fields', () => {
    expect(sort.parse('name')).toEqual({ field: 'name', direction: 'asc' });
    expect(sort.parse('-name')).toEqual({ field: 'name', direction: 'desc' });
    expect(sort.parse(undefined)).toEqual({ field: 'createdAt', direction: 'desc' });
  });

  it('rejects sort fields outside the allow-list', () => {
    expect(sort.safeParse('passwordHash').success).toBe(false);
    expect(sort.safeParse('--name').success).toBe(false);
  });

  it('parses booleans and comma-separated lists', () => {
    expect(booleanQuery.parse('true')).toBe(true);
    expect(booleanQuery.parse('0')).toBe(false);
    expect(booleanQuery.safeParse('yes').success).toBe(false);
    const types = csvQuery(z.enum(['VIDEO', 'PHONE', 'IN_PERSON']));
    expect(types.parse('VIDEO, PHONE')).toEqual(['VIDEO', 'PHONE']);
    expect(types.safeParse('VIDEO,TELEPATHY').success).toBe(false);
  });

  it('slugifies names', () => {
    expect(slugify('Riverside Skin & Hair Clinic')).toBe('riverside-skin-and-hair-clinic');
    expect(slugify('  Dr. Maya  Rao ')).toBe('dr-maya-rao');
  });
});

describe('tenant approval gate', () => {
  const pendingAdmin: AuthContext = {
    userId: 'u',
    email: 'x@carebridge.demo',
    roles: ['PHARMACY_ADMIN'],
    permissions: new Set(),
    patientId: null,
    doctorId: null,
    isPlatform: false,
    memberships: [{ organizationId: 'p1', organizationName: 'New', organizationType: 'PHARMACY', staffRole: 'ADMIN', approvalStatus: 'PENDING_APPROVAL' }],
  };

  it('lets pending organizations manage their profile but not operate', () => {
    expect(canAccessOrganization(pendingAdmin, 'p1', { adminOnly: true })).toBe(true);
    expect(canAccessOrganization(pendingAdmin, 'p1', { approvedOnly: true })).toBe(false);
  });
});

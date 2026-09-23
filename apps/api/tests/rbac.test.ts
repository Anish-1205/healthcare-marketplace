import { describe, expect, it } from 'vitest';
import { PERMISSIONS, ROLES, hasPermission, permissionsForRoles, primaryPortal } from '@carebridge/shared';
import { assertOrganizationAccess, canAccessOrganization, resolveActiveOrganizationId } from '../src/services/tenant.service';
import type { AuthContext } from '../src/types/auth';

const P = PERMISSIONS;

function ctx(overrides: Partial<AuthContext>): AuthContext {
  return {
    userId: 'u1',
    email: 'x@carebridge.demo',
    roles: [],
    permissions: new Set(),
    patientId: null,
    doctorId: null,
    memberships: [],
    isPlatform: false,
    ...overrides,
  };
}

describe('RBAC permission matrix', () => {
  it('gives every role at least one permission', () => {
    for (const role of ROLES) expect(permissionsForRoles([role]).size).toBeGreaterThan(0);
  });

  it('keeps patients out of provider and admin capabilities', () => {
    expect(hasPermission(['PATIENT'], P.APPOINTMENT_BOOK)).toBe(true);
    expect(hasPermission(['PATIENT'], P.PRESCRIPTION_CREATE)).toBe(false);
    expect(hasPermission(['PATIENT'], P.ORDER_MANAGE_PHARMACY)).toBe(false);
    expect(hasPermission(['PATIENT'], P.ADMIN_DATA_READ)).toBe(false);
  });

  it('lets only doctors create prescriptions', () => {
    const creators = ROLES.filter((role) => hasPermission([role], P.PRESCRIPTION_CREATE));
    expect(creators.sort()).toEqual(['DOCTOR', 'SUPER_ADMIN']);
  });

  it('separates staff from admin within an organization', () => {
    expect(hasPermission(['CLINIC_STAFF'], P.APPOINTMENT_READ_ORGANIZATION)).toBe(true);
    expect(hasPermission(['CLINIC_STAFF'], P.ORGANIZATION_STAFF_MANAGE)).toBe(false);
    expect(hasPermission(['CLINIC_ADMIN'], P.ORGANIZATION_STAFF_MANAGE)).toBe(true);
    expect(hasPermission(['PHARMACY_STAFF'], P.PHARMACY_PROFILE_MANAGE)).toBe(false);
    expect(hasPermission(['PHARMACY_ADMIN'], P.PHARMACY_PROFILE_MANAGE)).toBe(true);
  });

  it('restricts employee management and demo reset to platform admins', () => {
    expect(hasPermission(['PLATFORM_EMPLOYEE'], P.APPROVAL_MANAGE)).toBe(true);
    expect(hasPermission(['PLATFORM_EMPLOYEE'], P.EMPLOYEE_MANAGE)).toBe(false);
    expect(hasPermission(['PLATFORM_EMPLOYEE'], P.DEMO_RESET)).toBe(false);
    expect(hasPermission(['PLATFORM_ADMIN'], P.DEMO_RESET)).toBe(true);
  });

  it('grants super admin every permission', () => {
    for (const permission of Object.values(P)) expect(hasPermission(['SUPER_ADMIN'], permission)).toBe(true);
  });

  it('routes users to the right portal', () => {
    expect(primaryPortal(['PATIENT'])).toBe('patient');
    expect(primaryPortal(['DOCTOR'])).toBe('doctor');
    expect(primaryPortal(['PHARMACY_STAFF'])).toBe('pharmacy');
    expect(primaryPortal(['HOSPITAL_ADMIN'])).toBe('organization');
    expect(primaryPortal(['DOCTOR', 'CLINIC_ADMIN'])).toBe('organization');
    expect(primaryPortal(['PLATFORM_EMPLOYEE'])).toBe('admin');
  });
});

describe('tenant isolation', () => {
  const clinicAdmin = ctx({
    roles: ['CLINIC_ADMIN'],
    memberships: [{ organizationId: 'clinic-a', organizationName: 'A', organizationType: 'CLINIC', staffRole: 'ADMIN', approvalStatus: 'APPROVED' }],
  });
  const pharmacyStaff = ctx({
    roles: ['PHARMACY_STAFF'],
    memberships: [{ organizationId: 'pharm-a', organizationName: 'P', organizationType: 'PHARMACY', staffRole: 'STAFF', approvalStatus: 'APPROVED' }],
  });
  const platformAdmin = ctx({ roles: ['PLATFORM_ADMIN'], isPlatform: true });

  it('allows members into their own organization only', () => {
    expect(canAccessOrganization(clinicAdmin, 'clinic-a')).toBe(true);
    expect(canAccessOrganization(clinicAdmin, 'clinic-b')).toBe(false);
    expect(() => assertOrganizationAccess(clinicAdmin, 'clinic-b')).toThrow(/access to this organization/);
  });

  it('enforces organization type and admin-only checks', () => {
    expect(canAccessOrganization(clinicAdmin, 'clinic-a', { types: ['PHARMACY'] })).toBe(false);
    expect(canAccessOrganization(pharmacyStaff, 'pharm-a', { adminOnly: true })).toBe(false);
    expect(canAccessOrganization(pharmacyStaff, 'pharm-a')).toBe(true);
  });

  it('lets platform roles access any organization', () => {
    expect(canAccessOrganization(platformAdmin, 'anything', { adminOnly: true })).toBe(true);
  });

  it('resolves the active organization implicitly for single-membership staff', () => {
    expect(resolveActiveOrganizationId(pharmacyStaff, ['PHARMACY'])).toBe('pharm-a');
    expect(() => resolveActiveOrganizationId(pharmacyStaff, ['CLINIC'])).toThrow();
    expect(() => resolveActiveOrganizationId(pharmacyStaff, ['PHARMACY'], 'pharm-b')).toThrow();
  });
});

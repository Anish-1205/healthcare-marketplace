import type { OrganizationType } from '@carebridge/shared';
import type { AuthContext } from '../types/auth';
import { forbidden } from '../utils/errors';

/**
 * Tenant (organization) access rules for the demo.
 *
 * - Platform roles (employee / admin / super admin) can access every organization.
 * - Organization staff can access only organizations they have an active membership in.
 * - `adminOnly` additionally requires an ADMIN staff role in that organization.
 *
 * This is application-level isolation (not row-level security) — see docs/PRODUCTION_READINESS.md.
 */
export interface OrganizationAccessOptions {
  types?: OrganizationType[];
  adminOnly?: boolean;
  /** Block operational actions until the platform has approved the organization. */
  approvedOnly?: boolean;
}

export function canAccessOrganization(
  auth: AuthContext,
  organizationId: string,
  options: OrganizationAccessOptions = {},
): boolean {
  if (auth.isPlatform) return true;
  return auth.memberships.some(
    (membership) =>
      membership.organizationId === organizationId &&
      (!options.types || options.types.includes(membership.organizationType)) &&
      (!options.adminOnly || membership.staffRole === 'ADMIN') &&
      (!options.approvedOnly || membership.approvalStatus === 'APPROVED'),
  );
}

export function assertOrganizationAccess(
  auth: AuthContext,
  organizationId: string,
  options: OrganizationAccessOptions = {},
): void {
  if (!canAccessOrganization(auth, organizationId, options)) {
    throw forbidden('You do not have access to this organization.', 'TENANT_ACCESS_DENIED');
  }
}

/** Organization ids this user is a member of, optionally filtered by type. */
export function memberOrganizationIds(auth: AuthContext, types?: OrganizationType[]): string[] {
  return auth.memberships
    .filter((membership) => !types || types.includes(membership.organizationType))
    .map((membership) => membership.organizationId);
}

/**
 * Resolve the organization a portal request acts on. Staff with one membership of the
 * requested type get it implicitly; users with several must pass an explicit id.
 */
export function resolveActiveOrganizationId(
  auth: AuthContext,
  types: OrganizationType[],
  requestedId?: string,
): string {
  if (requestedId) {
    assertOrganizationAccess(auth, requestedId, { types });
    return requestedId;
  }
  const ids = memberOrganizationIds(auth, types);
  if (ids.length === 0) throw forbidden('You are not a member of any matching organization.', 'TENANT_ACCESS_DENIED');
  return ids[0];
}

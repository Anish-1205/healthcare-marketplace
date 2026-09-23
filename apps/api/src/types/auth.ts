import type { OrganizationMembership, Permission, Role } from '@carebridge/shared';

/** Authenticated request context, loaded fresh from the database on every request. */
export interface AuthContext {
  userId: string;
  email: string;
  roles: Role[];
  permissions: Set<Permission>;
  patientId: string | null;
  doctorId: string | null;
  /** Active organization memberships (clinic / hospital / pharmacy staff). */
  memberships: OrganizationMembership[];
  isPlatform: boolean;
}

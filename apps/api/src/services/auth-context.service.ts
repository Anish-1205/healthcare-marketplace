import {
  PLATFORM_ROLES,
  permissionsForRoles,
  primaryPortal,
  type AuthUser,
  type OrganizationMembership,
  type Role,
} from '@carebridge/shared';
import { prisma } from '../config/prisma';
import type { AuthContext } from '../types/auth';

const authUserInclude = {
  roles: { include: { role: true } },
  patient: { select: { id: true } },
  doctor: { select: { id: true, approvalStatus: true } },
  staffMemberships: {
    where: { isActive: true, organization: { isActive: true } },
    include: { organization: { select: { id: true, name: true, type: true, approvalStatus: true } } },
    orderBy: { joinedAt: 'asc' as const },
  },
} as const;

async function findAuthUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, include: authUserInclude });
}

type LoadedUser = NonNullable<Awaited<ReturnType<typeof findAuthUser>>>;

function buildContext(user: LoadedUser): AuthContext {
  const roles = user.roles.map((userRole) => userRole.role.name as Role);
  const memberships: OrganizationMembership[] = user.staffMemberships.map((membership) => ({
    organizationId: membership.organization.id,
    organizationName: membership.organization.name,
    organizationType: membership.organization.type,
    staffRole: membership.staffRole,
    approvalStatus: membership.organization.approvalStatus,
  }));

  return {
    userId: user.id,
    email: user.email,
    roles,
    permissions: permissionsForRoles(roles),
    patientId: user.patient?.id ?? null,
    doctorId: user.doctor?.id ?? null,
    memberships,
    isPlatform: roles.some((role) => PLATFORM_ROLES.includes(role)),
  };
}

export interface LoadedAuth {
  context: AuthContext;
  user: AuthUser;
  status: LoadedUser['status'];
}

/** Load a user's roles, permissions and tenant memberships. Returns null if the user no longer exists. */
export async function loadAuth(userId: string): Promise<LoadedAuth | null> {
  const user = await findAuthUser(userId);
  if (!user) return null;

  const context = buildContext(user);
  return {
    context,
    status: user.status,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      roles: context.roles,
      permissions: [...context.permissions].sort(),
      portal: primaryPortal(context.roles),
      patientId: context.patientId,
      doctorId: context.doctorId,
      doctorApprovalStatus: user.doctor?.approvalStatus ?? null,
      memberships: context.memberships,
    },
  };
}

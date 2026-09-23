import type { NotificationType } from '@prisma/client';
import { PLATFORM_ROLES } from '@carebridge/shared';
import { prisma, type Tx } from '../config/prisma';

/**
 * In-app notifications. Nothing is sent over SMS/email — see docs/PRODUCTION_READINESS.md.
 * Pass the transaction client so notifications commit together with the change that caused them.
 */
export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Frontend route to open, e.g. `/orders/<id>`. */
  link?: string | null;
  entityType?: string;
  entityId?: string;
}

export async function notify(inputs: NotificationInput | NotificationInput[], tx: Tx = prisma): Promise<void> {
  const data = Array.isArray(inputs) ? inputs : [inputs];
  if (data.length) await tx.notification.createMany({ data });
}

/** Send the same notification to several users (duplicates removed). */
export async function notifyUsers(userIds: string[], notification: Omit<NotificationInput, 'userId'>, tx: Tx = prisma) {
  await notify([...new Set(userIds)].map((userId) => ({ ...notification, userId })), tx);
}

/** Active platform staff who review registrations and oversee the marketplace. */
export async function platformReviewerIds(tx: Tx = prisma): Promise<string[]> {
  const users = await tx.user.findMany({
    where: { status: 'ACTIVE', roles: { some: { role: { name: { in: [...PLATFORM_ROLES] } } } } },
    select: { id: true },
  });
  return users.map((user) => user.id);
}

/** Active staff of an organization (optionally admins only). */
export async function organizationRecipientIds(
  organizationId: string,
  options: { adminOnly?: boolean } = {},
  tx: Tx = prisma,
): Promise<string[]> {
  const staff = await tx.organizationStaff.findMany({
    where: {
      organizationId,
      isActive: true,
      user: { status: 'ACTIVE' },
      ...(options.adminOnly ? { staffRole: 'ADMIN' as const } : {}),
    },
    select: { userId: true },
  });
  return staff.map((member) => member.userId);
}

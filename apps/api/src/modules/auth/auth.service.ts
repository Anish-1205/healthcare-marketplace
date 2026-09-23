import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { LoginResponse } from '@carebridge/shared';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { ACTIVITY, logActivity } from '../../services/activity-log.service';
import { loadAuth } from '../../services/auth-context.service';
import { AppError, badRequest, conflict, forbidden, unauthorized } from '../../utils/errors';
import { nextSequenceValue } from '../../utils/sequence';
import type { LoginInput, RegisterPatientInput, ResetPasswordInput } from './auth.schemas';
import { hashPassword, verifyPassword } from './password';
import { signAccessToken } from './token';

const RESET_TOKEN_TTL_MINUTES = 30;

export async function assertEmailAvailable(email: string): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw conflict('EMAIL_IN_USE', 'An account with this email already exists.');
}

export function isUniqueViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function issueSession(userId: string): Promise<LoginResponse> {
  const loaded = await loadAuth(userId);
  if (!loaded) throw unauthorized();
  return {
    token: signAccessToken({ sub: userId, roles: loaded.user.roles }),
    expiresIn: env.JWT_EXPIRES_IN,
    user: loaded.user,
  };
}

export async function login(input: LoginInput, ipAddress?: string): Promise<LoginResponse> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, passwordHash: true, status: true },
  });

  const valid = await verifyPassword(input.password, user?.passwordHash);
  if (!user || !valid) {
    throw unauthorized('Incorrect email or password.', 'INVALID_CREDENTIALS');
  }
  if (user.status === 'INACTIVE') {
    throw forbidden('This account has been deactivated. Please contact support.', 'ACCOUNT_INACTIVE');
  }
  if (user.status === 'PENDING_APPROVAL') {
    throw forbidden('This account is awaiting approval by the CareBridge team.', 'ACCOUNT_PENDING_APPROVAL');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logActivity({
    action: ACTIVITY.USER_LOGGED_IN,
    entityType: 'User',
    entityId: user.id,
    actorUserId: user.id,
    description: 'User signed in',
    ipAddress,
  });

  return issueSession(user.id);
}

export async function registerPatient(input: RegisterPatientInput, ipAddress?: string): Promise<LoginResponse> {
  await assertEmailAvailable(input.email);
  const passwordHash = await hashPassword(input.password);

  try {
    const userId = await prisma.$transaction(async (tx) => {
      const role = await tx.role.findUnique({ where: { name: 'PATIENT' } });
      if (!role) throw new AppError(500, 'ROLES_NOT_SEEDED', 'Roles are missing. Run the database seed.');

      const code = await nextSequenceValue(tx, 'PT');
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          roles: { create: { roleId: role.id } },
          patient: {
            create: {
              patientCode: `PT-${String(code).padStart(5, '0')}`,
              dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
              gender: input.gender,
            },
          },
        },
      });

      await logActivity(
        {
          action: ACTIVITY.PATIENT_REGISTERED,
          entityType: 'User',
          entityId: user.id,
          actorUserId: user.id,
          description: `${user.firstName} ${user.lastName} registered as a patient`,
          ipAddress,
        },
        tx,
      );
      return user.id;
    });

    return issueSession(userId);
  } catch (error) {
    // Concurrent registration with the same email.
    if (isUniqueViolation(error)) {
      throw conflict('EMAIL_IN_USE', 'An account with this email already exists.');
    }
    throw error;
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Mock forgot-password: always responds the same way so it can't be used to probe emails.
 * No email is sent. In DEMO_MODE the reset token is returned so the flow can be completed in the UI.
 */
export async function requestPasswordReset(email: string): Promise<{ message: string; demoResetToken?: string }> {
  const message = 'If an account exists for this email, password reset instructions have been sent.';
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, status: true } });
  if (!user || user.status !== 'ACTIVE') return { message };

  const token = randomBytes(32).toString('hex');
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
    },
  });
  await logActivity({
    action: ACTIVITY.PASSWORD_RESET_REQUESTED,
    entityType: 'User',
    entityId: user.id,
    actorUserId: user.id,
    description: 'Password reset requested (demo — no email sent)',
  });

  return env.DEMO_MODE ? { message, demoResetToken: token } : { message };
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = hashToken(input.token);
  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction(async (tx) => {
    const record = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw badRequest('INVALID_RESET_TOKEN', 'This reset link is invalid or has expired.');
    }

    // Conditional update makes the token single-use even under concurrent requests.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) throw badRequest('INVALID_RESET_TOKEN', 'This reset link has already been used.');

    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await logActivity(
      {
        action: ACTIVITY.PASSWORD_RESET_COMPLETED,
        entityType: 'User',
        entityId: record.userId,
        actorUserId: record.userId,
        description: 'Password was reset',
      },
      tx,
    );
  });
}

export async function getCurrentUser(userId: string) {
  const loaded = await loadAuth(userId);
  if (!loaded) throw unauthorized();
  return loaded.user;
}

export async function logout(userId: string, ipAddress?: string) {
  // Stateless JWT: the client discards the token. Server-side revocation is a production item.
  await logActivity({
    action: ACTIVITY.USER_LOGGED_OUT,
    entityType: 'User',
    entityId: userId,
    actorUserId: userId,
    description: 'User signed out',
    ipAddress,
  });
}

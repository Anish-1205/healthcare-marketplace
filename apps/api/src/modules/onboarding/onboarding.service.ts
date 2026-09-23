import type { LoginResponse, Role } from '@carebridge/shared';
import { prisma, type Tx } from '../../config/prisma';
import { ACTIVITY, logActivity } from '../../services/activity-log.service';
import { createMockDocument } from '../../services/document.service';
import { notifyUsers, platformReviewerIds } from '../../services/notification.service';
import { AppError, badRequest, conflict } from '../../utils/errors';
import { availableSlug } from '../../utils/slug';
import { assertEmailAvailable, isUniqueViolation, issueSession } from '../auth/auth.service';
import { hashPassword } from '../auth/password';
import type { DoctorOnboardingInput, OrganizationOnboardingInput } from './onboarding.schemas';

/**
 * Provider self-registration. Accounts are ACTIVE so providers can sign in and complete their
 * profile, but the doctor / organization stays PENDING_APPROVAL until platform staff approve it.
 */

const ADMIN_ROLE: Record<OrganizationOnboardingInput['organizationType'], Role> = {
  CLINIC: 'CLINIC_ADMIN',
  HOSPITAL: 'HOSPITAL_ADMIN',
  PHARMACY: 'PHARMACY_ADMIN',
};

async function roleId(tx: Tx, name: Role): Promise<string> {
  const role = await tx.role.findUnique({ where: { name }, select: { id: true } });
  if (!role) throw new AppError(500, 'ROLES_NOT_SEEDED', 'Roles are missing. Run the database seed.');
  return role.id;
}

/** Translate unique-constraint races into friendly conflicts. */
function rethrowConflict(error: unknown): never {
  if (isUniqueViolation(error)) {
    const target = String(error.meta?.target ?? '');
    if (target.includes('registrationNumber')) {
      throw conflict('REGISTRATION_NUMBER_IN_USE', 'This medical registration number is already registered.');
    }
    throw conflict('EMAIL_IN_USE', 'An account with this email already exists.');
  }
  throw error;
}

export async function registerDoctor(input: DoctorOnboardingInput, ipAddress?: string): Promise<LoginResponse> {
  await assertEmailAvailable(input.email);
  if (await prisma.doctor.findUnique({ where: { registrationNumber: input.registrationNumber }, select: { id: true } })) {
    throw conflict('REGISTRATION_NUMBER_IN_USE', 'This medical registration number is already registered.');
  }

  const specialties = await prisma.specialty.findMany({ where: { slug: { in: input.specialties } }, select: { id: true, slug: true, name: true } });
  const unknown = input.specialties.filter((slug) => !specialties.some((specialty) => specialty.slug === slug));
  if (unknown.length) throw badRequest('UNKNOWN_SPECIALTY', `Unknown specialty: ${unknown.join(', ')}.`);

  const passwordHash = await hashPassword(input.password);
  const name = `Dr. ${input.firstName} ${input.lastName}`;

  try {
    const userId = await prisma.$transaction(async (tx) => {
      const slug = await availableSlug(`dr ${input.firstName} ${input.lastName}`, async (candidate) =>
        Boolean(await tx.doctor.findUnique({ where: { slug: candidate }, select: { id: true } })),
      );

      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          roles: { create: { roleId: await roleId(tx, 'DOCTOR') } },
          doctor: {
            create: {
              slug,
              registrationNumber: input.registrationNumber,
              qualifications: input.qualifications,
              experienceYears: input.experienceYears,
              bio: input.bio,
              gender: input.gender,
              languages: input.languages,
              consultationFee: input.consultationFee,
              consultationTypes: input.consultationTypes,
              approvalStatus: 'PENDING_APPROVAL',
              specialties: {
                create: input.specialties.map((slugValue, index) => ({
                  specialtyId: specialties.find((specialty) => specialty.slug === slugValue)!.id,
                  isPrimary: index === 0,
                })),
              },
            },
          },
        },
        include: { doctor: { select: { id: true } } },
      });
      const doctorId = user.doctor!.id;

      for (const document of input.documents) {
        await createMockDocument({ ...document, uploadedById: user.id }, tx);
      }

      await logActivity(
        { action: ACTIVITY.DOCTOR_REGISTERED, entityType: 'Doctor', entityId: doctorId, actorUserId: user.id, description: `${name} registered as a doctor`, ipAddress },
        tx,
      );
      const primarySpecialty = specialties.find((specialty) => specialty.slug === input.specialties[0])!.name;
      await notifyUsers(
        await platformReviewerIds(tx),
        {
          type: 'REGISTRATION_SUBMITTED',
          title: 'New doctor registration',
          message: `${name} (${primarySpecialty}) is awaiting approval.`,
          link: '/admin/approvals',
          entityType: 'Doctor',
          entityId: doctorId,
        },
        tx,
      );
      return user.id;
    });
    return issueSession(userId);
  } catch (error) {
    rethrowConflict(error);
  }
}

export async function registerOrganization(input: OrganizationOnboardingInput, ipAddress?: string): Promise<LoginResponse> {
  await assertEmailAvailable(input.email);
  const passwordHash = await hashPassword(input.password);
  const type = input.organizationType;
  const typeLabel = type.charAt(0) + type.slice(1).toLowerCase();

  try {
    const userId = await prisma.$transaction(async (tx) => {
      const slug = await availableSlug(input.organizationName, async (candidate) =>
        Boolean(await tx.organization.findUnique({ where: { slug: candidate }, select: { id: true } })),
      );

      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          roles: { create: { roleId: await roleId(tx, ADMIN_ROLE[type]) } },
        },
      });

      const organization = await tx.organization.create({
        data: {
          type,
          name: input.organizationName,
          slug,
          category: input.category ?? (type === 'PHARMACY' ? 'Retail Pharmacy' : type === 'HOSPITAL' ? 'Hospital' : 'Clinic'),
          description: input.description,
          phone: input.businessPhone,
          email: input.businessEmail,
          registrationNumber: input.registrationNumber,
          licenseNumber: input.licenseNumber,
          contactPerson: `${input.firstName} ${input.lastName}`,
          addressLine1: input.address.line1,
          addressLine2: input.address.line2,
          locality: input.address.locality,
          city: input.address.city,
          state: input.address.state,
          postalCode: input.address.postalCode,
          opensAt: input.is24Hours ? null : input.opensAt,
          closesAt: input.is24Hours ? null : input.closesAt,
          is24Hours: input.is24Hours,
          openDays: [0, 1, 2, 3, 4, 5, 6],
          acceptsPrescriptions: type === 'PHARMACY',
          deliveryAvailable: type === 'PHARMACY' ? (input.pharmacy?.deliveryAvailable ?? true) : false,
          pickupAvailable: type === 'PHARMACY' ? (input.pharmacy?.pickupAvailable ?? true) : false,
          approvalStatus: 'PENDING_APPROVAL',
          staff: { create: { userId: user.id, staffRole: 'ADMIN', title: 'Owner' } },
        },
      });

      for (const document of input.documents) {
        await createMockDocument({ ...document, uploadedById: user.id, organizationId: organization.id }, tx);
      }

      await logActivity(
        {
          action: ACTIVITY.ORGANIZATION_REGISTERED,
          entityType: 'Organization',
          entityId: organization.id,
          organizationId: organization.id,
          actorUserId: user.id,
          description: `${organization.name} registered as a ${typeLabel.toLowerCase()}`,
          ipAddress,
        },
        tx,
      );
      await notifyUsers(
        await platformReviewerIds(tx),
        {
          type: 'REGISTRATION_SUBMITTED',
          title: `New ${typeLabel.toLowerCase()} registration`,
          message: `${organization.name} submitted a registration and is awaiting approval.`,
          link: '/admin/approvals',
          entityType: 'Organization',
          entityId: organization.id,
        },
        tx,
      );
      return user.id;
    });
    return issueSession(userId);
  } catch (error) {
    rethrowConflict(error);
  }
}

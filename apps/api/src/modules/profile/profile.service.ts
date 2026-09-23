import type { Address } from '@prisma/client';
import type { PatientProfile, SavedAddress } from '@carebridge/shared';
import { prisma } from '../../config/prisma';
import type { AuthContext } from '../../types/auth';
import { notFound } from '../../utils/errors';
import { patientId } from '../reviews/reviews.service';
import type { AddressInput, UpdateProfileInput } from './profile.schemas';

export async function getProfile(auth: AuthContext): Promise<PatientProfile> {
  const patient = await prisma.patient.findUniqueOrThrow({ where: { id: patientId(auth) }, include: { user: true } });
  return {
    firstName: patient.user.firstName,
    lastName: patient.user.lastName,
    email: patient.user.email,
    phone: patient.user.phone,
    avatarUrl: patient.user.avatarUrl,
    dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.toISOString().slice(0, 10) : null,
    gender: patient.gender,
    emergencyContactName: patient.emergencyContactName,
    emergencyContactPhone: patient.emergencyContactPhone,
    emergencyContactRelation: patient.emergencyContactRelation,
  };
}

export async function updateProfile(auth: AuthContext, input: UpdateProfileInput): Promise<PatientProfile> {
  const id = patientId(auth);
  const { firstName, lastName, phone, avatarUrl, dateOfBirth, ...patientFields } = input;
  await prisma.$transaction([
    prisma.user.update({ where: { id: auth.userId }, data: { firstName, lastName, phone, avatarUrl } }),
    prisma.patient.update({
      where: { id },
      data: { ...patientFields, ...(dateOfBirth !== undefined ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null } : {}) },
    }),
  ]);
  return getProfile(auth);
}

function toSaved(row: Address): SavedAddress {
  const { userId: _userId, createdAt: _createdAt, updatedAt: _updatedAt, ...address } = row;
  return address;
}

export async function listAddresses(auth: AuthContext): Promise<SavedAddress[]> {
  patientId(auth);
  const rows = await prisma.address.findMany({ where: { userId: auth.userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] });
  return rows.map(toSaved);
}

export async function createAddress(auth: AuthContext, input: AddressInput): Promise<SavedAddress> {
  patientId(auth);
  return prisma.$transaction(async (tx) => {
    // The first address a patient saves becomes their default.
    const isDefault = Boolean(input.isDefault) || (await tx.address.count({ where: { userId: auth.userId } })) === 0;
    if (isDefault) await tx.address.updateMany({ where: { userId: auth.userId }, data: { isDefault: false } });
    return toSaved(await tx.address.create({ data: { ...input, isDefault, userId: auth.userId } }));
  });
}

export async function updateAddress(auth: AuthContext, id: string, input: AddressInput): Promise<SavedAddress> {
  patientId(auth);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.address.findFirst({ where: { id, userId: auth.userId } });
    if (!existing) throw notFound('Address');
    // A default can only be moved (by marking another address), not cleared, so one always exists.
    const isDefault = existing.isDefault || Boolean(input.isDefault);
    if (isDefault) await tx.address.updateMany({ where: { userId: auth.userId, id: { not: id } }, data: { isDefault: false } });
    return toSaved(await tx.address.update({ where: { id }, data: { ...input, isDefault } }));
  });
}

export async function deleteAddress(auth: AuthContext, id: string) {
  patientId(auth);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.address.findFirst({ where: { id, userId: auth.userId } });
    if (!existing) throw notFound('Address');
    // Orders and lab bookings keep their own delivery snapshot; their FK is SET NULL.
    await tx.address.delete({ where: { id } });
    if (existing.isDefault) {
      const next = await tx.address.findFirst({ where: { userId: auth.userId }, orderBy: { createdAt: 'asc' } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
    return { id, removed: true };
  });
}

import type { Prisma } from '@prisma/client';
import {
  PRESCRIPTION_VALIDITY_DAYS,
  type PrescriptionDetail,
  type PrescriptionPharmacyMatch,
  type PrescriptionSummary,
} from '@carebridge/shared';
import { prisma, type Tx } from '../../config/prisma';
import { openStatus, listed as listedOrganization } from '../organizations/organizations.service';
import { ACTIVITY, logActivity } from '../../services/activity-log.service';
import { notify } from '../../services/notification.service';
import { canAccessOrganization } from '../../services/tenant.service';
import type { AuthContext } from '../../types/auth';
import { ageFrom } from '../../utils/age';
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors';
import { toSkipTake } from '../../utils/http';
import { nextNumber } from '../../utils/sequence';
import type { CreatePrescriptionInput, ListPrescriptionsQuery, PrescriptionItemInput, UpdatePrescriptionInput } from './prescriptions.schemas';

/**
 * Prescriptions are written by hand: the doctor picks a medicine from the catalogue (or types a
 * name) and fills in dosage, frequency, duration, timing and instructions themselves. Nothing here
 * derives clinical content. A prescription is a DRAFT until the doctor issues it; only then does
 * it appear in the patient's account.
 */

export const prescriptionInclude = {
  items: { orderBy: { sortOrder: 'asc' as const } },
  doctor: {
    include: {
      user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      specialties: { include: { specialty: { select: { name: true } } }, orderBy: { isPrimary: 'desc' as const } },
    },
  },
  patient: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
  organization: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.PrescriptionInclude;

export type PrescriptionRow = Prisma.PrescriptionGetPayload<{ include: typeof prescriptionInclude }>;

export function toPrescriptionSummary(row: PrescriptionRow): PrescriptionSummary {
  return {
    id: row.id,
    prescriptionNumber: row.prescriptionNumber,
    status: row.status,
    diagnosis: row.diagnosis,
    issuedAt: row.issuedAt?.toISOString() ?? null,
    validUntil: row.validUntil ? row.validUntil.toISOString().slice(0, 10) : null,
    createdAt: row.createdAt.toISOString(),
    itemCount: row.items.length,
    consultationId: row.consultationId,
    doctor: {
      id: row.doctor.id,
      slug: row.doctor.slug,
      name: `Dr. ${row.doctor.user.firstName} ${row.doctor.user.lastName}`,
      avatarUrl: row.doctor.user.avatarUrl,
      primarySpecialty: row.doctor.specialties[0]?.specialty.name ?? 'General Physician',
      qualifications: row.doctor.qualifications,
      registrationNumber: row.doctor.registrationNumber,
    },
    patient: {
      id: row.patient.id,
      name: `${row.patient.user.firstName} ${row.patient.user.lastName}`,
      avatarUrl: row.patient.user.avatarUrl,
      age: ageFrom(row.patient.dateOfBirth),
      gender: row.patient.gender,
    },
    organization: row.organization,
  };
}

export function toPrescriptionDetail(row: PrescriptionRow): PrescriptionDetail {
  return {
    ...toPrescriptionSummary(row),
    advice: row.advice,
    items: row.items.map((item) => ({
      id: item.id,
      medicineId: item.medicineId,
      medicineName: item.medicineName,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      timing: item.timing,
      instructions: item.instructions,
      quantity: item.quantity,
      sortOrder: item.sortOrder,
    })),
  };
}

async function findOrThrow(id: string): Promise<PrescriptionRow> {
  const row = await prisma.prescription.findUnique({ where: { id }, include: prescriptionInclude });
  if (!row) throw notFound('Prescription');
  return row;
}

/**
 * Who may read a prescription: the doctor who wrote it (any status), and — once issued — the
 * patient it was written for and staff of the clinic it was written at. A draft belongs to its
 * author alone.
 */
function canView(auth: AuthContext, row: PrescriptionRow): boolean {
  if (auth.doctorId && auth.doctorId === row.doctorId) return true;
  if (auth.isPlatform) return true;
  if (row.status === 'DRAFT') return false;
  if (auth.patientId && auth.patientId === row.patientId) return true;
  return Boolean(row.organizationId && canAccessOrganization(auth, row.organizationId));
}

function requireDoctorId(auth: AuthContext): string {
  if (!auth.doctorId) throw forbidden('Only doctors can write prescriptions.', 'DOCTOR_PROFILE_REQUIRED');
  return auth.doctorId;
}

function assertAuthor(auth: AuthContext, row: PrescriptionRow): void {
  if (!auth.doctorId || auth.doctorId !== row.doctorId) {
    throw forbidden('Only the prescribing doctor can change this prescription.', 'PRESCRIPTION_ACCESS_DENIED');
  }
}

function itemRows(prescriptionId: string, items: PrescriptionItemInput[]) {
  return items.map((item, index) => ({
    prescriptionId,
    medicineId: item.medicineId ?? null,
    medicineName: item.medicineName,
    dosage: item.dosage,
    frequency: item.frequency,
    duration: item.duration,
    timing: item.timing ?? null,
    instructions: item.instructions ?? null,
    quantity: item.quantity,
    sortOrder: index,
  }));
}

/** Medicines referenced by id must exist, so the pharmacy side can price them later. */
async function assertMedicinesExist(tx: Tx, items: PrescriptionItemInput[]): Promise<void> {
  const ids = [...new Set(items.map((item) => item.medicineId).filter((id): id is string => Boolean(id)))];
  if (!ids.length) return;
  const found = await tx.medicine.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true } });
  if (found.length !== ids.length) throw badRequest('UNKNOWN_MEDICINE', 'One of the selected medicines is no longer available.');
}

export async function createPrescription(auth: AuthContext, input: CreatePrescriptionInput): Promise<PrescriptionDetail> {
  const doctorId = requireDoctorId(auth);

  let patientId = input.patientId ?? null;
  let organizationId: string | null = null;

  if (input.consultationId) {
    const consultation = await prisma.consultation.findUnique({
      where: { id: input.consultationId },
      include: { appointment: { select: { organizationId: true } }, prescriptions: { where: { status: { not: 'CANCELLED' } }, select: { id: true } } },
    });
    if (!consultation) throw notFound('Consultation');
    if (consultation.doctorId !== doctorId) throw forbidden('This consultation is not yours.', 'CONSULTATION_ACCESS_DENIED');
    if (consultation.prescriptions.length) {
      throw conflict('PRESCRIPTION_EXISTS', 'This consultation already has a prescription. Edit that one instead.');
    }
    patientId = consultation.patientId;
    organizationId = consultation.appointment.organizationId;
  } else {
    // Standalone prescription: the doctor must actually have seen this patient.
    const seen = await prisma.appointment.findFirst({
      where: { doctorId, patientId: patientId!, status: { not: 'CANCELLED' } },
      select: { organizationId: true },
      orderBy: { scheduledStart: 'desc' },
    });
    if (!seen) throw forbidden('This patient is not assigned to you.', 'PATIENT_ACCESS_DENIED');
    organizationId = seen.organizationId;
  }

  const id = await prisma.$transaction(async (tx) => {
    await assertMedicinesExist(tx, input.items);
    const prescription = await tx.prescription.create({
      data: {
        prescriptionNumber: await nextNumber(tx, 'prescription'),
        consultationId: input.consultationId ?? null,
        doctorId,
        patientId: patientId!,
        organizationId,
        status: 'DRAFT',
        diagnosis: input.diagnosis ?? null,
        advice: input.advice ?? null,
        validUntil: input.validUntil ? new Date(`${input.validUntil}T00:00:00Z`) : null,
      },
      select: { id: true },
    });
    await tx.prescriptionItem.createMany({ data: itemRows(prescription.id, input.items) });
    return prescription.id;
  });

  return toPrescriptionDetail(await findOrThrow(id));
}

export async function updatePrescription(auth: AuthContext, id: string, input: UpdatePrescriptionInput): Promise<PrescriptionDetail> {
  const prescription = await findOrThrow(id);
  assertAuthor(auth, prescription);
  if (prescription.status !== 'DRAFT') {
    throw conflict('PRESCRIPTION_ISSUED', 'An issued prescription can no longer be edited.');
  }

  await prisma.$transaction(async (tx) => {
    if (input.items) await assertMedicinesExist(tx, input.items);
    await tx.prescription.update({
      where: { id },
      data: {
        ...(input.diagnosis !== undefined ? { diagnosis: input.diagnosis } : {}),
        ...(input.advice !== undefined ? { advice: input.advice } : {}),
        ...(input.validUntil !== undefined ? { validUntil: input.validUntil ? new Date(`${input.validUntil}T00:00:00Z`) : null } : {}),
      },
    });
    if (input.items) {
      await tx.prescriptionItem.deleteMany({ where: { prescriptionId: id } });
      await tx.prescriptionItem.createMany({ data: itemRows(id, input.items) });
    }
  });

  return toPrescriptionDetail(await findOrThrow(id));
}

/** Issue a draft: it gets a date, becomes read-only, and shows up in the patient's account. */
export async function issuePrescription(auth: AuthContext, id: string, ipAddress?: string, tx?: Tx): Promise<PrescriptionDetail> {
  const prescription = await findOrThrow(id);
  assertAuthor(auth, prescription);
  if (prescription.status === 'ISSUED') return toPrescriptionDetail(prescription);
  if (prescription.status !== 'DRAFT') throw conflict('PRESCRIPTION_CANCELLED', 'This prescription was cancelled and cannot be issued.');
  if (!prescription.items.length) throw badRequest('EMPTY_PRESCRIPTION', 'Add at least one medicine before issuing.');

  const now = new Date();
  const run = async (client: Tx) => {
    await client.prescription.update({
      where: { id },
      data: {
        status: 'ISSUED',
        issuedAt: now,
        validUntil: prescription.validUntil ?? new Date(now.getTime() + PRESCRIPTION_VALIDITY_DAYS * 86_400_000),
      },
    });

    const doctorName = `Dr. ${prescription.doctor.user.firstName} ${prescription.doctor.user.lastName}`;
    await notify(
      {
        userId: prescription.patient.userId,
        type: 'PRESCRIPTION_ISSUED',
        title: 'New prescription',
        message: `${doctorName} issued prescription ${prescription.prescriptionNumber}.`,
        link: `/prescriptions/${id}`,
        entityType: 'Prescription',
        entityId: id,
      },
      client,
    );

    await logActivity(
      {
        action: ACTIVITY.PRESCRIPTION_ISSUED,
        entityType: 'Prescription',
        entityId: id,
        description: `${doctorName} issued ${prescription.prescriptionNumber} for ${prescription.patient.user.firstName} ${prescription.patient.user.lastName}`,
        actorUserId: auth.userId,
        organizationId: prescription.organizationId,
        ipAddress,
      },
      client,
    );
  };

  if (tx) await run(tx);
  else await prisma.$transaction(run);

  return toPrescriptionDetail(await findOrThrow(id));
}

export async function getPrescription(auth: AuthContext, id: string): Promise<PrescriptionDetail> {
  const prescription = await findOrThrow(id);
  if (!canView(auth, prescription)) throw forbidden('You do not have access to this prescription.', 'PRESCRIPTION_ACCESS_DENIED');
  return toPrescriptionDetail(prescription);
}

/** Scoped by role: doctors see what they wrote, patients and clinics only what has been issued. */
export async function listPrescriptions(auth: AuthContext, query: ListPrescriptionsQuery) {
  const scopeWhere: Prisma.PrescriptionWhereInput | null = auth.doctorId
    ? { doctorId: auth.doctorId }
    : auth.patientId
      ? { patientId: auth.patientId, status: { not: 'DRAFT' } }
      : auth.isPlatform
        ? {}
        : auth.memberships.length
          ? { organizationId: { in: auth.memberships.map((membership) => membership.organizationId) }, status: { not: 'DRAFT' } }
          : null;
  if (!scopeWhere) throw forbidden('You do not have any prescriptions to view.', 'PRESCRIPTION_ACCESS_DENIED');

  const where: Prisma.PrescriptionWhereInput = {
    AND: [
      scopeWhere,
      ...(query.status?.length ? [{ status: { in: query.status } }] : []),
      ...(query.patientId ? [{ patientId: query.patientId }] : []),
      ...(query.consultationId ? [{ consultationId: query.consultationId }] : []),
    ],
  };

  const [rows, total] = await prisma.$transaction([
    prisma.prescription.findMany({ where, include: prescriptionInclude, orderBy: { createdAt: 'desc' }, ...toSkipTake(query) }),
    prisma.prescription.count({ where }),
  ]);

  return { data: rows.map(toPrescriptionSummary), total };
}

/**
 * Pharmacies that can fulfil an issued prescription, for the "choose a pharmacy" step. Only
 * items the doctor picked from the medicine catalogue (`medicineId` set) can be matched against
 * inventory — a hand-typed medicine name can never be confirmed in stock anywhere, so a
 * prescription containing one is never reported as fully matched.
 */
export async function getPrescriptionPharmacies(auth: AuthContext, id: string): Promise<PrescriptionPharmacyMatch[]> {
  const prescription = await findOrThrow(id);
  if (!canView(auth, prescription)) throw forbidden('You do not have access to this prescription.', 'PRESCRIPTION_ACCESS_DENIED');
  if (prescription.status !== 'ISSUED') throw conflict('PRESCRIPTION_NOT_ISSUED', 'Only issued prescriptions can be ordered.');

  const quantityByMedicine = new Map<string, number>();
  for (const item of prescription.items) {
    if (!item.medicineId) continue;
    quantityByMedicine.set(item.medicineId, (quantityByMedicine.get(item.medicineId) ?? 0) + item.quantity);
  }
  const medicineIds = [...quantityByMedicine.keys()];
  const totalItemCount = prescription.items.length;

  const pharmacies = await prisma.organization.findMany({
    where: { ...listedOrganization, type: 'PHARMACY', acceptsPrescriptions: true },
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      locality: true,
      avgRating: true,
      reviewCount: true,
      is24Hours: true,
      opensAt: true,
      closesAt: true,
      openDays: true,
      deliveryAvailable: true,
      pickupAvailable: true,
      deliveryEtaMinMinutes: true,
      deliveryEtaMaxMinutes: true,
      inventory: medicineIds.length
        ? { where: { medicineId: { in: medicineIds }, isActive: true, stockQuantity: { gt: 0 } }, select: { medicineId: true, sellingPrice: true } }
        : false,
    },
  });

  const now = new Date();
  const matches: PrescriptionPharmacyMatch[] = pharmacies.map((pharmacy) => {
    const inventory = pharmacy.inventory ?? [];
    const { isOpenNow, hoursLabel } = openStatus(pharmacy, now);
    return {
      pharmacy: {
        id: pharmacy.id,
        slug: pharmacy.slug,
        name: pharmacy.name,
        logoUrl: pharmacy.logoUrl,
        locality: pharmacy.locality,
        avgRating: Number(pharmacy.avgRating),
        reviewCount: pharmacy.reviewCount,
        isOpenNow,
        hoursLabel,
        deliveryAvailable: pharmacy.deliveryAvailable,
        pickupAvailable: pharmacy.pickupAvailable,
        deliveryEtaMinMinutes: pharmacy.deliveryEtaMinMinutes,
        deliveryEtaMaxMinutes: pharmacy.deliveryEtaMaxMinutes,
      },
      matchedItemCount: prescription.items.filter((item) => inventory.some((row) => row.medicineId === item.medicineId)).length,
      totalItemCount,
      estimatedTotal: inventory.reduce((sum, row) => sum + Number(row.sellingPrice) * (quantityByMedicine.get(row.medicineId) ?? 0), 0),
      hasAllItems: prescription.items.every((item) => inventory.some((row) => row.medicineId === item.medicineId)),
    };
  });

  return matches.sort((a, b) => {
    if (a.hasAllItems !== b.hasAllItems) return a.hasAllItems ? -1 : 1;
    if (a.matchedItemCount !== b.matchedItemCount) return b.matchedItemCount - a.matchedItemCount;
    return b.pharmacy.avgRating - a.pharmacy.avgRating;
  });
}

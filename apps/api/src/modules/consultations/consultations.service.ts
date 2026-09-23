import type { Prisma } from '@prisma/client';
import {
  APPOINTMENT_STATUS_TRANSITIONS,
  canTransition,
  type ConsultationDetail,
  type ConsultationSummary,
} from '@carebridge/shared';
import { prisma } from '../../config/prisma';
import { ACTIVITY, logActivity } from '../../services/activity-log.service';
import { notify } from '../../services/notification.service';
import { canAccessOrganization } from '../../services/tenant.service';
import type { AuthContext } from '../../types/auth';
import { ageFrom } from '../../utils/age';
import { conflict, forbidden, notFound } from '../../utils/errors';
import { toSkipTake } from '../../utils/http';
import { prescriptionInclude, toPrescriptionDetail, toPrescriptionSummary } from '../prescriptions/prescriptions.service';
import { issuePrescription } from '../prescriptions/prescriptions.service';
import type { ListConsultationsQuery, UpdateConsultationInput } from './consultations.schemas';

/**
 * The consultation workspace. Everything clinical here is typed by the doctor; the application
 * stores it verbatim and never suggests, completes or derives any of it.
 */

const consultationInclude = {
  appointment: {
    select: {
      id: true,
      appointmentNumber: true,
      reason: true,
      patientNotes: true,
      scheduledStart: true,
      consultationType: true,
      status: true,
      organizationId: true,
      organization: { select: { name: true } },
    },
  },
  doctor: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      specialties: { include: { specialty: { select: { name: true } } }, orderBy: { isPrimary: 'desc' as const } },
    },
  },
  patient: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, phone: true } } } },
  prescriptions: { where: { status: { not: 'CANCELLED' as const } }, include: prescriptionInclude },
} satisfies Prisma.ConsultationInclude;

type ConsultationRow = Prisma.ConsultationGetPayload<{ include: typeof consultationInclude }>;

function toSummary(row: ConsultationRow): ConsultationSummary {
  return {
    id: row.id,
    appointmentId: row.appointmentId,
    status: row.status,
    chiefComplaint: row.chiefComplaint,
    diagnosis: row.diagnosis,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    scheduledStart: row.appointment.scheduledStart.toISOString(),
    consultationType: row.appointment.consultationType,
    patient: {
      id: row.patient.id,
      name: `${row.patient.user.firstName} ${row.patient.user.lastName}`,
      avatarUrl: row.patient.user.avatarUrl,
      age: ageFrom(row.patient.dateOfBirth),
      gender: row.patient.gender,
    },
    doctor: {
      id: row.doctor.id,
      slug: row.doctor.slug,
      name: `Dr. ${row.doctor.user.firstName} ${row.doctor.user.lastName}`,
      avatarUrl: row.doctor.user.avatarUrl,
      primarySpecialty: row.doctor.specialties[0]?.specialty.name ?? 'General Physician',
      qualifications: row.doctor.qualifications,
      registrationNumber: row.doctor.registrationNumber,
    },
    prescriptionId: row.prescriptions[0]?.id ?? null,
  };
}

async function findOrThrow(id: string): Promise<ConsultationRow> {
  const row = await prisma.consultation.findUnique({ where: { id }, include: consultationInclude });
  if (!row) throw notFound('Consultation');
  return row;
}

/** The treating doctor, the patient themselves, staff of the clinic it happened at, or platform staff. */
function canView(auth: AuthContext, row: ConsultationRow): boolean {
  if (auth.isPlatform) return true;
  if (auth.doctorId && auth.doctorId === row.doctorId) return true;
  if (auth.patientId && auth.patientId === row.patientId) return true;
  return Boolean(row.appointment.organizationId && canAccessOrganization(auth, row.appointment.organizationId));
}

function assertTreatingDoctor(auth: AuthContext, row: ConsultationRow): void {
  if (!auth.doctorId || auth.doctorId !== row.doctorId) {
    throw forbidden('Only the treating doctor can change this consultation.', 'CONSULTATION_ACCESS_DENIED');
  }
}

/**
 * Start (or re-open) the consultation for an appointment. Re-entering the workspace returns the
 * existing consultation rather than creating a second one.
 */
export async function startConsultation(auth: AuthContext, appointmentId: string, ipAddress?: string): Promise<ConsultationDetail> {
  const doctorId = auth.doctorId;
  if (!doctorId) throw forbidden('Only doctors can start a consultation.', 'DOCTOR_PROFILE_REQUIRED');

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      consultation: { select: { id: true } },
      patient: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!appointment) throw notFound('Appointment');
  if (appointment.doctorId !== doctorId) throw forbidden('This appointment is not yours.', 'APPOINTMENT_ACCESS_DENIED');
  if (appointment.consultation) return getConsultation(auth, appointment.consultation.id);

  if (appointment.status !== 'IN_CONSULTATION' && !canTransition(APPOINTMENT_STATUS_TRANSITIONS, appointment.status, 'IN_CONSULTATION')) {
    throw conflict('INVALID_STATUS_TRANSITION', 'Confirm the appointment before starting the consultation.');
  }

  const now = new Date();
  const consultationId = await prisma.$transaction(async (tx) => {
    const consultation = await tx.consultation.create({
      data: {
        appointmentId,
        doctorId,
        patientId: appointment.patientId,
        status: 'IN_PROGRESS',
        // The reason the patient gave is a starting point the doctor edits in their own words.
        chiefComplaint: appointment.reason,
        startedAt: now,
      },
      select: { id: true },
    });

    if (appointment.status !== 'IN_CONSULTATION') {
      await tx.appointment.update({ where: { id: appointmentId }, data: { status: 'IN_CONSULTATION', startedAt: now } });
      await tx.appointmentStatusHistory.create({
        data: { appointmentId, fromStatus: appointment.status, toStatus: 'IN_CONSULTATION', changedById: auth.userId, note: 'Consultation started' },
      });
    }

    await logActivity(
      {
        action: ACTIVITY.CONSULTATION_STARTED,
        entityType: 'Consultation',
        entityId: consultation.id,
        description: `Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName} started a consultation with ${appointment.patient.user.firstName} ${appointment.patient.user.lastName}`,
        actorUserId: auth.userId,
        organizationId: appointment.organizationId,
        ipAddress,
      },
      tx,
    );

    return consultation.id;
  });

  return getConsultation(auth, consultationId);
}

export async function updateConsultation(auth: AuthContext, id: string, input: UpdateConsultationInput): Promise<ConsultationDetail> {
  const consultation = await findOrThrow(id);
  assertTreatingDoctor(auth, consultation);
  if (consultation.status === 'COMPLETED') {
    throw conflict('CONSULTATION_COMPLETED', 'This consultation has been completed and can no longer be edited.');
  }

  await prisma.consultation.update({
    where: { id },
    data: {
      ...(input.chiefComplaint !== undefined ? { chiefComplaint: input.chiefComplaint } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.diagnosis !== undefined ? { diagnosis: input.diagnosis } : {}),
      ...(input.observations !== undefined ? { observations: input.observations } : {}),
      ...(input.followUpDate !== undefined ? { followUpDate: input.followUpDate ? new Date(`${input.followUpDate}T00:00:00Z`) : null } : {}),
    },
  });

  return getConsultation(auth, id);
}

/**
 * Finish the visit: the consultation and its appointment are closed, and a prescription still
 * sitting in draft is issued — otherwise it would never reach the patient.
 */
export async function completeConsultation(auth: AuthContext, id: string, ipAddress?: string): Promise<ConsultationDetail> {
  const consultation = await findOrThrow(id);
  assertTreatingDoctor(auth, consultation);
  if (consultation.status === 'COMPLETED') throw conflict('CONSULTATION_COMPLETED', 'This consultation is already complete.');

  const now = new Date();
  const draft = consultation.prescriptions.find((prescription) => prescription.status === 'DRAFT');
  const doctorName = `Dr. ${consultation.doctor.user.firstName} ${consultation.doctor.user.lastName}`;

  await prisma.$transaction(async (tx) => {
    await tx.consultation.update({ where: { id }, data: { status: 'COMPLETED', completedAt: now } });

    if (consultation.appointment.status === 'IN_CONSULTATION') {
      await tx.appointment.update({ where: { id: consultation.appointmentId }, data: { status: 'COMPLETED', completedAt: now } });
      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: consultation.appointmentId,
          fromStatus: 'IN_CONSULTATION',
          toStatus: 'COMPLETED',
          changedById: auth.userId,
          note: 'Consultation completed',
        },
      });
      // Pay-at-clinic fees are collected at the desk when the visit ends.
      await tx.payment.updateMany({
        where: { appointmentId: consultation.appointmentId, method: 'PAY_AT_CLINIC', status: 'PENDING' },
        data: { status: 'PAID', paidAt: now },
      });
    }

    await notify(
      {
        userId: consultation.patient.user.id,
        type: 'SYSTEM',
        title: 'Consultation completed',
        message: `${doctorName} has completed your consultation.`,
        link: `/appointments/${consultation.appointmentId}`,
        entityType: 'Consultation',
        entityId: id,
      },
      tx,
    );

    await logActivity(
      {
        action: ACTIVITY.CONSULTATION_COMPLETED,
        entityType: 'Consultation',
        entityId: id,
        description: `${doctorName} completed a consultation with ${consultation.patient.user.firstName} ${consultation.patient.user.lastName}`,
        actorUserId: auth.userId,
        organizationId: consultation.appointment.organizationId,
        ipAddress,
      },
      tx,
    );
  });

  if (draft) await issuePrescription(auth, draft.id, ipAddress);

  return getConsultation(auth, id);
}

export async function getConsultation(auth: AuthContext, id: string): Promise<ConsultationDetail> {
  const consultation = await findOrThrow(id);
  if (!canView(auth, consultation)) throw forbidden('You do not have access to this consultation.', 'CONSULTATION_ACCESS_DENIED');

  /*
   * History shown beside the workspace. The treating doctor sees the patient's earlier
   * consultations and issued prescriptions, including ones written by other doctors, because
   * that context is the point of the visit. Production systems gate this behind consent /
   * care-relationship rules — see docs/PRODUCTION_READINESS.md.
   */
  const [previousConsultations, previousPrescriptions] = await Promise.all([
    prisma.consultation.findMany({
      where: { patientId: consultation.patientId, id: { not: id }, status: 'COMPLETED' },
      include: { doctor: { include: { user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { startedAt: 'desc' },
      take: 10,
    }),
    prisma.prescription.findMany({
      where: { patientId: consultation.patientId, status: 'ISSUED', id: { notIn: consultation.prescriptions.map((p) => p.id) } },
      include: prescriptionInclude,
      orderBy: { issuedAt: 'desc' },
      take: 10,
    }),
  ]);

  const prescription = consultation.prescriptions[0] ?? null;

  return {
    ...toSummary(consultation),
    notes: consultation.notes,
    observations: consultation.observations,
    followUpDate: consultation.followUpDate ? consultation.followUpDate.toISOString().slice(0, 10) : null,
    appointment: {
      id: consultation.appointment.id,
      appointmentNumber: consultation.appointment.appointmentNumber,
      reason: consultation.appointment.reason,
      patientNotes: consultation.appointment.patientNotes,
      organizationName: consultation.appointment.organization?.name ?? null,
    },
    patientContact: { phone: consultation.patient.user.phone, bloodGroup: consultation.patient.bloodGroup },
    prescription: prescription ? toPrescriptionDetail(prescription) : null,
    previousConsultations: previousConsultations.map((entry) => ({
      id: entry.id,
      doctorName: `Dr. ${entry.doctor.user.firstName} ${entry.doctor.user.lastName}`,
      diagnosis: entry.diagnosis,
      notes: entry.notes,
      startedAt: entry.startedAt.toISOString(),
      completedAt: entry.completedAt?.toISOString() ?? null,
    })),
    previousPrescriptions: previousPrescriptions.map(toPrescriptionSummary),
  };
}

export async function listConsultations(auth: AuthContext, query: ListConsultationsQuery) {
  const scopeWhere: Prisma.ConsultationWhereInput | null = auth.doctorId
    ? { doctorId: auth.doctorId }
    : auth.patientId
      ? { patientId: auth.patientId }
      : auth.isPlatform
        ? {}
        : auth.memberships.length
          ? { appointment: { organizationId: { in: auth.memberships.map((membership) => membership.organizationId) } } }
          : null;
  if (!scopeWhere) throw forbidden('You do not have any consultations to view.', 'CONSULTATION_ACCESS_DENIED');

  const where: Prisma.ConsultationWhereInput = {
    AND: [
      scopeWhere,
      ...(query.scope === 'active' ? [{ status: 'IN_PROGRESS' as const }] : query.scope === 'completed' ? [{ status: 'COMPLETED' as const }] : []),
      ...(query.patientId ? [{ patientId: query.patientId }] : []),
    ],
  };

  const [rows, total] = await prisma.$transaction([
    prisma.consultation.findMany({ where, include: consultationInclude, orderBy: { startedAt: 'desc' }, ...toSkipTake(query) }),
    prisma.consultation.count({ where }),
  ]);

  return { data: rows.map(toSummary), total };
}

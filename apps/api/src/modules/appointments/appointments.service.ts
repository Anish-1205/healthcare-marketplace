import type { Prisma } from '@prisma/client';
import {
  ACTIVE_APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_TRANSITIONS,
  MAX_RESCHEDULES,
  canTransition,
  type AppointmentDetail,
  type AppointmentStatus,
  type AppointmentSummary,
  type ConsultationType,
} from '@carebridge/shared';
import { prisma, type Tx } from '../../config/prisma';
import { ACTIVITY, logActivity } from '../../services/activity-log.service';
import { getSlotsForDate } from '../../services/availability.service';
import { notify, organizationRecipientIds, notifyUsers } from '../../services/notification.service';
import { canAccessOrganization } from '../../services/tenant.service';
import type { AuthContext } from '../../types/auth';
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors';
import { toSkipTake } from '../../utils/http';
import { nextNumber } from '../../utils/sequence';
import { PLATFORM_TIMEZONE } from '../../utils/time';
import { isUniqueViolation } from '../auth/auth.service';
import type {
  BookAppointmentInput,
  CancelAppointmentInput,
  ListAppointmentsQuery,
  RescheduleAppointmentInput,
  UpdateAppointmentStatusInput,
} from './appointments.schemas';

/**
 * Appointment booking and lifecycle.
 *
 * Slot validity is always re-checked against `availability.service` — the client's slot list
 * may be stale — and the database has a partial unique index on (doctorId, scheduledStart)
 * for appointments that are not cancelled, so concurrent bookings cannot both win.
 */

// Exported so doctor-portal.service can reuse the same row shape and summary mapping
// for dashboard widgets and patient history without duplicating the include/mapping logic.
export const appointmentInclude = {
  doctor: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      specialties: { include: { specialty: { select: { name: true } } }, orderBy: { isPrimary: 'desc' as const } },
    },
  },
  patient: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
  organization: { select: { id: true, slug: true, name: true, type: true, locality: true, addressLine1: true, city: true, phone: true } },
  payments: { orderBy: { createdAt: 'desc' as const } },
  consultation: { select: { id: true } },
} satisfies Prisma.AppointmentInclude;

export type AppointmentRow = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;
type AppointmentRowWithHistory = Prisma.AppointmentGetPayload<{
  include: typeof appointmentInclude & { statusHistory: { orderBy: { createdAt: 'asc' } } };
}>;

export function toSummary(row: AppointmentRow, now: Date): AppointmentSummary {
  const isBeforeStart = row.scheduledStart.getTime() > now.getTime();
  const isOpen = (ACTIVE_APPOINTMENT_STATUSES as readonly string[]).includes(row.status);
  const payment = row.payments[0] ?? null;

  return {
    id: row.id,
    appointmentNumber: row.appointmentNumber,
    status: row.status,
    consultationType: row.consultationType,
    scheduledStart: row.scheduledStart.toISOString(),
    scheduledEnd: row.scheduledEnd.toISOString(),
    fee: Number(row.fee),
    reason: row.reason,
    doctor: {
      id: row.doctor.id,
      slug: row.doctor.slug,
      name: `Dr. ${row.doctor.user.firstName} ${row.doctor.user.lastName}`,
      avatarUrl: row.doctor.user.avatarUrl,
      primarySpecialty: row.doctor.specialties[0]?.specialty.name ?? 'General Physician',
      qualifications: row.doctor.qualifications,
    },
    patient: {
      id: row.patient.id,
      name: `${row.patient.user.firstName} ${row.patient.user.lastName}`,
      avatarUrl: row.patient.user.avatarUrl,
    },
    organization: row.organization
      ? {
          id: row.organization.id,
          slug: row.organization.slug,
          name: row.organization.name,
          type: row.organization.type,
          locality: row.organization.locality,
          addressLine1: row.organization.addressLine1,
          city: row.organization.city,
          phone: row.organization.phone,
        }
      : null,
    payment: payment
      ? {
          id: payment.id,
          transactionRef: payment.transactionRef,
          amount: Number(payment.amount),
          method: payment.method,
          methodDetail: payment.methodDetail,
          status: payment.status,
          paidAt: payment.paidAt?.toISOString() ?? null,
          refundedAt: payment.refundedAt?.toISOString() ?? null,
        }
      : null,
    canCancel: isOpen && isBeforeStart && canTransition(APPOINTMENT_STATUS_TRANSITIONS, row.status, 'CANCELLED'),
    canReschedule:
      isBeforeStart && (row.status === 'PENDING' || row.status === 'CONFIRMED') && row.rescheduleCount < MAX_RESCHEDULES,
  };
}

function toDetail(row: AppointmentRowWithHistory, now: Date): AppointmentDetail {
  return {
    ...toSummary(row, now),
    patientNotes: row.patientNotes,
    cancellationReason: row.cancellationReason,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    checkedInAt: row.checkedInAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    rescheduleCount: row.rescheduleCount,
    createdAt: row.createdAt.toISOString(),
    statusHistory: row.statusHistory.map((event) => ({
      id: event.id,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      note: event.note,
      createdAt: event.createdAt.toISOString(),
    })),
    consultationId: row.consultation?.id ?? null,
  };
}

const withHistory = { ...appointmentInclude, statusHistory: { orderBy: { createdAt: 'asc' as const } } };

async function findOrThrow(id: string): Promise<AppointmentRowWithHistory> {
  const row = await prisma.appointment.findUnique({ where: { id }, include: withHistory });
  if (!row) throw notFound('Appointment');
  return row;
}

/** Who may see an appointment: its patient, its doctor, staff of its organization, platform roles. */
function canView(auth: AuthContext, row: AppointmentRow): boolean {
  if (auth.isPlatform) return true;
  if (auth.patientId && auth.patientId === row.patientId) return true;
  if (auth.doctorId && auth.doctorId === row.doctorId) return true;
  return Boolean(row.organizationId && canAccessOrganization(auth, row.organizationId));
}

function assertCanView(auth: AuthContext, row: AppointmentRow): void {
  if (!canView(auth, row)) throw forbidden('You do not have access to this appointment.', 'APPOINTMENT_ACCESS_DENIED');
}

function formatWhen(start: Date): string {
  return start.toLocaleString('en-IN', {
    timeZone: PLATFORM_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Simulated payment instrument label — no payment provider is integrated. */
function methodDetailFor(method: BookAppointmentInput['paymentMethod'], firstName: string, lastName: string): string | null {
  if (method === 'CARD') return 'VISA •••• 4242';
  if (method === 'UPI') return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@okdemo`;
  return null;
}

interface ResolvedSlot {
  start: Date;
  end: Date;
  organizationId: string | null;
  fee: number;
}

/**
 * Re-checks the requested time against the live availability engine and resolves the fee
 * for the organization the slot belongs to.
 */
async function resolveSlot(
  doctorId: string,
  scheduledStart: string,
  consultationType: ConsultationType,
  organizationId: string | null | undefined,
): Promise<ResolvedSlot> {
  const start = new Date(scheduledStart);
  const doctor = await prisma.doctor.findFirst({
    where: { id: doctorId, approvalStatus: 'APPROVED', isActive: true, user: { status: 'ACTIVE' } },
    include: { organizations: { where: { isActive: true }, select: { organizationId: true, consultationFee: true } } },
  });
  if (!doctor) throw notFound('Doctor');
  if (!doctor.consultationTypes.includes(consultationType)) {
    throw badRequest('CONSULTATION_TYPE_UNAVAILABLE', 'This doctor does not offer that consultation type.');
  }

  const slots = await getSlotsForDate(doctorId, start);
  const slot = slots.find(
    (candidate) =>
      new Date(candidate.start).getTime() === start.getTime() &&
      candidate.consultationTypes.includes(consultationType) &&
      (organizationId === undefined || candidate.organizationId === (organizationId ?? null)),
  );
  if (!slot) throw conflict('SLOT_UNAVAILABLE', 'That appointment slot is no longer available. Please choose another time.');

  const link = slot.organizationId ? doctor.organizations.find((org) => org.organizationId === slot.organizationId) : undefined;
  return {
    start,
    end: new Date(slot.end),
    organizationId: slot.organizationId,
    fee: Number(link?.consultationFee ?? doctor.consultationFee),
  };
}

async function assertNoPatientClash(tx: Tx, patientId: string, start: Date, end: Date, excludeAppointmentId?: string) {
  const clash = await tx.appointment.findFirst({
    where: {
      patientId,
      status: { in: ACTIVE_APPOINTMENT_STATUSES as AppointmentStatus[] },
      scheduledStart: { lt: end },
      scheduledEnd: { gt: start },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: { id: true },
  });
  if (clash) {
    throw conflict('PATIENT_SLOT_CONFLICT', 'You already have an appointment at this time.');
  }
}

export async function bookAppointment(auth: AuthContext, input: BookAppointmentInput, ipAddress?: string): Promise<AppointmentDetail> {
  const patientId = auth.patientId;
  if (!patientId) throw forbidden('Only patients can book appointments.', 'PATIENT_PROFILE_REQUIRED');

  const slot = await resolveSlot(input.doctorId, input.scheduledStart, input.consultationType, input.organizationId);
  const patient = await prisma.patient.findUniqueOrThrow({
    where: { id: patientId },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  const paidOnline = input.paymentMethod !== 'PAY_AT_CLINIC';
  const status: AppointmentStatus = paidOnline ? 'CONFIRMED' : 'PENDING';
  const now = new Date();

  try {
    const appointmentId = await prisma.$transaction(async (tx) => {
      await assertNoPatientClash(tx, patientId, slot.start, slot.end);

      const appointment = await tx.appointment.create({
        data: {
          appointmentNumber: await nextNumber(tx, 'appointment', now),
          patientId,
          doctorId: input.doctorId,
          organizationId: slot.organizationId,
          consultationType: input.consultationType,
          scheduledStart: slot.start,
          scheduledEnd: slot.end,
          status,
          reason: input.reason ?? null,
          patientNotes: input.patientNotes ?? null,
          fee: slot.fee,
        },
        include: { doctor: { select: { userId: true, user: { select: { firstName: true, lastName: true } } } } },
      });

      await tx.appointmentStatusHistory.createMany({
        data: [
          { appointmentId: appointment.id, fromStatus: null, toStatus: 'PENDING', changedById: auth.userId, note: 'Booked by patient' },
          ...(paidOnline
            ? [
                {
                  appointmentId: appointment.id,
                  fromStatus: 'PENDING' as const,
                  toStatus: 'CONFIRMED' as const,
                  changedById: auth.userId,
                  note: 'Payment received',
                },
              ]
            : []),
        ],
      });

      await tx.payment.create({
        data: {
          transactionRef: await nextNumber(tx, 'transaction', now),
          patientId,
          purpose: 'APPOINTMENT',
          appointmentId: appointment.id,
          amount: slot.fee,
          method: input.paymentMethod,
          methodDetail: methodDetailFor(input.paymentMethod, patient.user.firstName, patient.user.lastName),
          status: paidOnline ? 'PAID' : 'PENDING',
          paidAt: paidOnline ? now : null,
        },
      });

      const patientName = `${patient.user.firstName} ${patient.user.lastName}`;
      const doctorName = `Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`;
      const when = formatWhen(slot.start);
      const entity = { entityType: 'Appointment', entityId: appointment.id };

      await notify(
        [
          {
            userId: appointment.doctor.userId,
            type: 'APPOINTMENT_BOOKED',
            title: 'New appointment',
            message: `${patientName} booked ${when}.`,
            link: `/doctor/appointments/${appointment.id}`,
            ...entity,
          },
          {
            userId: auth.userId,
            type: paidOnline ? 'APPOINTMENT_CONFIRMED' : 'APPOINTMENT_BOOKED',
            title: paidOnline ? 'Appointment confirmed' : 'Appointment requested',
            message: paidOnline
              ? `Your appointment with ${doctorName} on ${when} is confirmed.`
              : `Your appointment request with ${doctorName} for ${when} has been sent.`,
            link: `/appointments/${appointment.id}`,
            ...entity,
          },
        ],
        tx,
      );

      if (slot.organizationId) {
        await notifyUsers(
          await organizationRecipientIds(slot.organizationId, { adminOnly: true }, tx),
          {
            type: 'APPOINTMENT_BOOKED',
            title: 'New appointment',
            message: `${patientName} booked ${doctorName} for ${when}.`,
            link: '/organization/appointments',
            ...entity,
          },
          tx,
        );
      }

      await logActivity(
        {
          action: ACTIVITY.APPOINTMENT_BOOKED,
          entityType: 'Appointment',
          entityId: appointment.id,
          description: `${patientName} booked ${doctorName} for ${when}`,
          actorUserId: auth.userId,
          organizationId: slot.organizationId,
          ipAddress,
        },
        tx,
      );

      return appointment.id;
    });

    return toDetail(await findOrThrow(appointmentId), new Date());
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('SLOT_UNAVAILABLE', 'That appointment slot has just been taken. Please choose another time.');
    }
    throw error;
  }
}

export async function cancelAppointment(
  auth: AuthContext,
  id: string,
  input: CancelAppointmentInput,
  ipAddress?: string,
): Promise<AppointmentDetail> {
  const appointment = await findOrThrow(id);
  assertCanView(auth, appointment);

  if (!canTransition(APPOINTMENT_STATUS_TRANSITIONS, appointment.status, 'CANCELLED')) {
    throw conflict('INVALID_STATUS_TRANSITION', 'This appointment can no longer be cancelled.');
  }
  const now = new Date();
  if (appointment.scheduledStart.getTime() <= now.getTime()) {
    throw conflict('APPOINTMENT_STARTED', 'This appointment has already started and cannot be cancelled.');
  }

  const cancelledByPatient = auth.patientId === appointment.patientId;
  const actorName = cancelledByPatient
    ? `${appointment.patient.user.firstName} ${appointment.patient.user.lastName}`
    : `Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`;
  const when = formatWhen(appointment.scheduledStart);

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id },
      data: { status: 'CANCELLED', cancellationReason: input.reason ?? null, cancelledAt: now },
    });
    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId: id,
        fromStatus: appointment.status,
        toStatus: 'CANCELLED',
        changedById: auth.userId,
        note: input.reason ?? null,
      },
    });

    // Simulated refunds: online payments are returned, unpaid clinic payments are voided.
    await tx.payment.updateMany({
      where: { appointmentId: id, status: 'PAID' },
      data: { status: 'REFUNDED', refundedAt: now },
    });
    await tx.payment.updateMany({
      where: { appointmentId: id, status: 'PENDING' },
      data: { status: 'FAILED', failureReason: 'Appointment cancelled' },
    });

    const entity = { entityType: 'Appointment', entityId: id };
    await notify(
      {
        // The party that did not cancel is the one who needs to hear about it.
        userId: cancelledByPatient ? appointment.doctor.user.id : appointment.patient.user.id,
        type: 'APPOINTMENT_CANCELLED',
        title: 'Appointment cancelled',
        message: `${actorName} cancelled the appointment on ${when}.`,
        link: cancelledByPatient ? `/doctor/appointments/${id}` : `/appointments/${id}`,
        ...entity,
      },
      tx,
    );

    await logActivity(
      {
        action: ACTIVITY.APPOINTMENT_CANCELLED,
        entityType: 'Appointment',
        entityId: id,
        description: `${actorName} cancelled the appointment on ${when}`,
        actorUserId: auth.userId,
        organizationId: appointment.organizationId,
        ipAddress,
      },
      tx,
    );
  });

  return toDetail(await findOrThrow(id), new Date());
}

export async function rescheduleAppointment(
  auth: AuthContext,
  id: string,
  input: RescheduleAppointmentInput,
  ipAddress?: string,
): Promise<AppointmentDetail> {
  const appointment = await findOrThrow(id);
  assertCanView(auth, appointment);

  if (appointment.status !== 'PENDING' && appointment.status !== 'CONFIRMED') {
    throw conflict('INVALID_STATUS_TRANSITION', 'Only pending or confirmed appointments can be rescheduled.');
  }
  const now = new Date();
  if (appointment.scheduledStart.getTime() <= now.getTime()) {
    throw conflict('APPOINTMENT_STARTED', 'This appointment has already started and cannot be moved.');
  }
  if (appointment.rescheduleCount >= MAX_RESCHEDULES) {
    throw conflict('RESCHEDULE_LIMIT_REACHED', `An appointment can be rescheduled at most ${MAX_RESCHEDULES} times. Please book a new one.`);
  }

  const consultationType = input.consultationType ?? appointment.consultationType;
  // Checked before resolving availability: this appointment holds its own slot, so the engine
  // would otherwise report the current time as taken instead of saying it hasn't moved.
  if (new Date(input.scheduledStart).getTime() === appointment.scheduledStart.getTime()) {
    throw badRequest('SAME_SLOT', 'Pick a different time to reschedule to.');
  }
  const slot = await resolveSlot(appointment.doctorId, input.scheduledStart, consultationType, input.organizationId);

  const previousWhen = formatWhen(appointment.scheduledStart);
  const when = formatWhen(slot.start);
  const rescheduledByPatient = auth.patientId === appointment.patientId;
  const actorName = rescheduledByPatient
    ? `${appointment.patient.user.firstName} ${appointment.patient.user.lastName}`
    : `Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`;

  try {
    await prisma.$transaction(async (tx) => {
      await assertNoPatientClash(tx, appointment.patientId, slot.start, slot.end, id);

      await tx.appointment.update({
        where: { id },
        data: {
          scheduledStart: slot.start,
          scheduledEnd: slot.end,
          organizationId: slot.organizationId,
          consultationType,
          rescheduleCount: { increment: 1 },
        },
      });
      // The fee stays as booked: the patient has already paid (or agreed to pay) that amount.

      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: id,
          fromStatus: appointment.status,
          toStatus: appointment.status,
          changedById: auth.userId,
          note: `Rescheduled from ${previousWhen} to ${when}`,
        },
      });

      const entity = { entityType: 'Appointment', entityId: id };
      await notify(
        {
          userId: rescheduledByPatient ? appointment.doctor.user.id : appointment.patient.user.id,
          type: 'APPOINTMENT_RESCHEDULED',
          title: 'Appointment rescheduled',
          message: `${actorName} moved the appointment from ${previousWhen} to ${when}.`,
          link: rescheduledByPatient ? `/doctor/appointments/${id}` : `/appointments/${id}`,
          ...entity,
        },
        tx,
      );

      await logActivity(
        {
          action: ACTIVITY.APPOINTMENT_RESCHEDULED,
          entityType: 'Appointment',
          entityId: id,
          description: `${actorName} rescheduled the appointment from ${previousWhen} to ${when}`,
          actorUserId: auth.userId,
          organizationId: slot.organizationId,
          ipAddress,
        },
        tx,
      );
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('SLOT_UNAVAILABLE', 'That appointment slot has just been taken. Please choose another time.');
    }
    throw error;
  }

  return toDetail(await findOrThrow(id), new Date());
}

/**
 * Doctor / clinic-side status moves: confirm a pending request, check a patient in, or mark a
 * no-show. Starting and completing a consultation happens through the consultation workspace
 * (phase 10), not here — the route only ever offers CONFIRMED / CHECKED_IN / NO_SHOW as targets.
 */
export async function updateAppointmentStatus(
  auth: AuthContext,
  id: string,
  input: UpdateAppointmentStatusInput,
  ipAddress?: string,
): Promise<AppointmentDetail> {
  const appointment = await findOrThrow(id);
  assertCanView(auth, appointment);

  if (!canTransition(APPOINTMENT_STATUS_TRANSITIONS, appointment.status, input.status)) {
    throw conflict('INVALID_STATUS_TRANSITION', `An appointment cannot move from ${appointment.status} to ${input.status}.`);
  }

  const now = new Date();
  const doctorName = `Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`;
  const when = formatWhen(appointment.scheduledStart);
  const PATIENT_MESSAGE: Record<UpdateAppointmentStatusInput['status'], string> = {
    CONFIRMED: `${doctorName} confirmed your appointment on ${when}.`,
    CHECKED_IN: `You're checked in for your appointment with ${doctorName}.`,
    NO_SHOW: `You were marked as a no-show for your appointment with ${doctorName} on ${when}.`,
  };

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.status === 'CHECKED_IN' ? { checkedInAt: now } : {}),
      },
    });
    await tx.appointmentStatusHistory.create({
      data: { appointmentId: id, fromStatus: appointment.status, toStatus: input.status, changedById: auth.userId, note: input.note ?? null },
    });

    await notify(
      {
        userId: appointment.patient.user.id,
        type: input.status === 'CONFIRMED' ? 'APPOINTMENT_CONFIRMED' : 'SYSTEM',
        title: input.status === 'CONFIRMED' ? 'Appointment confirmed' : input.status === 'CHECKED_IN' ? 'Checked in' : 'Marked as no-show',
        message: PATIENT_MESSAGE[input.status],
        link: `/appointments/${id}`,
        entityType: 'Appointment',
        entityId: id,
      },
      tx,
    );

    await logActivity(
      {
        action: ACTIVITY.APPOINTMENT_STATUS_UPDATED,
        entityType: 'Appointment',
        entityId: id,
        description: `${doctorName} marked the appointment on ${when} as ${input.status}`,
        actorUserId: auth.userId,
        organizationId: appointment.organizationId,
        ipAddress,
      },
      tx,
    );
  });

  return toDetail(await findOrThrow(id), new Date());
}

export async function getAppointment(auth: AuthContext, id: string): Promise<AppointmentDetail> {
  const appointment = await findOrThrow(id);
  assertCanView(auth, appointment);
  return toDetail(appointment, new Date());
}

/**
 * Appointments for the signed-in user, scoped by who they are: patients see their own,
 * doctors their schedule, organization staff their clinic's bookings.
 */
export async function listAppointments(auth: AuthContext, query: ListAppointmentsQuery) {
  const now = new Date();

  const scopeWhere: Prisma.AppointmentWhereInput | null = auth.patientId
    ? { patientId: auth.patientId }
    : auth.doctorId
      ? { doctorId: auth.doctorId }
      : auth.memberships.length
        ? { organizationId: { in: auth.memberships.map((membership) => membership.organizationId) } }
        : null;
  if (!scopeWhere) throw forbidden('You do not have any appointments to view.', 'APPOINTMENT_ACCESS_DENIED');

  // Kept in an AND list so an explicit `status` filter and the scope filter both apply.
  const scopeFilter: Prisma.AppointmentWhereInput | null =
    query.scope === 'upcoming'
      ? { scheduledStart: { gte: now }, status: { in: ACTIVE_APPOINTMENT_STATUSES as AppointmentStatus[] } }
      : query.scope === 'past'
        ? { OR: [{ scheduledStart: { lt: now } }, { status: { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] } }] }
        : null;

  const where: Prisma.AppointmentWhereInput = {
    AND: [
      scopeWhere,
      ...(query.doctorId ? [{ doctorId: query.doctorId }] : []),
      ...(query.status?.length ? [{ status: { in: query.status } }] : []),
      ...(scopeFilter ? [scopeFilter] : []),
    ],
  };

  const [rows, total] = await prisma.$transaction([
    prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { [query.sort.field]: query.sort.direction },
      ...toSkipTake(query),
    }),
    prisma.appointment.count({ where }),
  ]);

  return { data: rows.map((row) => toSummary(row, now)), total };
}

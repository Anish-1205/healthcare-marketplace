import type { Prisma } from '@prisma/client';
import {
  ACTIVE_APPOINTMENT_STATUSES,
  NON_ENCOUNTER_STATUSES,
  type AppointmentStatus,
  type DoctorAvailabilityState,
  type DoctorDashboard,
  type DoctorPatientDetail,
  type DoctorPatientSummary,
  type DoctorProfile,
  type Gender,
} from '@carebridge/shared';
import { prisma } from '../../config/prisma';
import { appointmentInclude, toSummary } from '../appointments/appointments.service';
import { badRequest, forbidden, notFound } from '../../utils/errors';
import { istDateTime } from '../../utils/time';
import type { AuthContext } from '../../types/auth';
import type {
  AvailabilityWindowInput,
  BlockedDateInput,
  ListMyPatientsQuery,
  ReplaceAvailabilityInput,
  UpdateDoctorProfileInput,
} from './doctor-me.schemas';

/**
 * Self-service for the signed-in doctor: profile, weekly availability, blocked dates,
 * dashboard stats and the roster of patients they've seen (or have upcoming visits with).
 *
 * Doctors reach their own data through `auth.doctorId` only — there is no id parameter here,
 * so there is nothing to authorize against another doctor's records.
 */

function requireDoctorId(auth: AuthContext): string {
  if (!auth.doctorId) throw forbidden('Only doctors can access this.', 'DOCTOR_PROFILE_REQUIRED');
  return auth.doctorId;
}

const profileInclude = {
  user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
  specialties: { include: { specialty: { select: { id: true, name: true, slug: true } } }, orderBy: { isPrimary: 'desc' as const } },
  organizations: {
    where: { isActive: true },
    orderBy: { isPrimary: 'desc' as const },
    include: { organization: { select: { id: true, name: true, slug: true, type: true, locality: true } } },
  },
} satisfies Prisma.DoctorInclude;

type ProfileRow = Prisma.DoctorGetPayload<{ include: typeof profileInclude }>;

function toProfile(doctor: ProfileRow): DoctorProfile {
  return {
    id: doctor.id,
    slug: doctor.slug,
    firstName: doctor.user.firstName,
    lastName: doctor.user.lastName,
    email: doctor.user.email,
    phone: doctor.user.phone,
    avatarUrl: doctor.user.avatarUrl,
    bio: doctor.bio,
    qualifications: doctor.qualifications,
    registrationNumber: doctor.registrationNumber,
    experienceYears: doctor.experienceYears,
    gender: doctor.gender,
    languages: doctor.languages,
    specialties: doctor.specialties.map((link) => ({ id: link.specialty.id, name: link.specialty.name, slug: link.specialty.slug, isPrimary: link.isPrimary })),
    consultationFee: Number(doctor.consultationFee),
    consultationTypes: doctor.consultationTypes,
    slotDurationMinutes: doctor.slotDurationMinutes,
    avgRating: Number(doctor.avgRating),
    reviewCount: doctor.reviewCount,
    approvalStatus: doctor.approvalStatus,
    rejectionReason: doctor.rejectionReason,
    isActive: doctor.isActive,
    organizations: doctor.organizations.map((link) => ({
      organizationId: link.organization.id,
      organizationName: link.organization.name,
      organizationType: link.organization.type,
      organizationSlug: link.organization.slug,
      locality: link.organization.locality,
      title: link.title,
      isPrimary: link.isPrimary,
      consultationFee: Number(link.consultationFee ?? doctor.consultationFee),
    })),
  };
}

export async function getMyProfile(auth: AuthContext): Promise<DoctorProfile> {
  const doctor = await prisma.doctor.findUniqueOrThrow({ where: { id: requireDoctorId(auth) }, include: profileInclude });
  return toProfile(doctor);
}

export async function updateMyProfile(auth: AuthContext, input: UpdateDoctorProfileInput): Promise<DoctorProfile> {
  const doctorId = requireDoctorId(auth);

  let specialtyIds: string[] | undefined;
  if (input.specialties) {
    const specialties = await prisma.specialty.findMany({ where: { slug: { in: input.specialties } }, select: { id: true, slug: true } });
    const unknown = input.specialties.filter((slug) => !specialties.some((specialty) => specialty.slug === slug));
    if (unknown.length) throw badRequest('UNKNOWN_SPECIALTY', `Unknown specialty: ${unknown.join(', ')}.`);
    // Preserve the caller's ordering (first = primary) rather than the query's.
    specialtyIds = input.specialties.map((slug) => specialties.find((specialty) => specialty.slug === slug)!.id);
  }

  await prisma.$transaction(async (tx) => {
    await tx.doctor.update({
      where: { id: doctorId },
      data: {
        ...(input.bio !== undefined ? { bio: input.bio } : {}),
        ...(input.qualifications !== undefined ? { qualifications: input.qualifications } : {}),
        ...(input.experienceYears !== undefined ? { experienceYears: input.experienceYears } : {}),
        ...(input.languages !== undefined ? { languages: input.languages } : {}),
        ...(input.consultationFee !== undefined ? { consultationFee: input.consultationFee } : {}),
        ...(input.consultationTypes !== undefined ? { consultationTypes: input.consultationTypes } : {}),
      },
    });

    if (input.avatarUrl !== undefined) {
      await tx.user.update({ where: { id: auth.userId }, data: { avatarUrl: input.avatarUrl } });
    }

    if (specialtyIds) {
      await tx.doctorSpecialty.deleteMany({ where: { doctorId } });
      await tx.doctorSpecialty.createMany({
        data: specialtyIds.map((specialtyId, index) => ({ doctorId, specialtyId, isPrimary: index === 0 })),
      });
    }
  });

  return getMyProfile(auth);
}

// ── Availability ─────────────────────────────────────────────

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export async function getMyAvailability(auth: AuthContext): Promise<DoctorAvailabilityState> {
  const doctorId = requireDoctorId(auth);
  const [windows, blockedDates] = await Promise.all([
    prisma.doctorAvailability.findMany({
      where: { doctorId },
      include: { organization: { select: { name: true } } },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    }),
    prisma.doctorBlockedDate.findMany({ where: { doctorId }, orderBy: { date: 'asc' } }),
  ]);

  return {
    windows: windows.map((window) => ({
      id: window.id,
      organizationId: window.organizationId,
      organizationName: window.organizationId ? (window.organization?.name ?? 'Clinic') : 'Independent / online',
      dayOfWeek: window.dayOfWeek,
      startTime: window.startTime,
      endTime: window.endTime,
      breakStartTime: window.breakStartTime,
      breakEndTime: window.breakEndTime,
      slotDurationMinutes: window.slotDurationMinutes,
      consultationTypes: window.consultationTypes,
      isActive: window.isActive,
    })),
    blockedDates: blockedDates.map((blocked) => ({ id: blocked.id, date: blocked.date.toISOString().slice(0, 10), reason: blocked.reason })),
  };
}

/** Validates one window against the doctor's own offerings and the rest of the submitted set. */
function validateWindow(window: AvailabilityWindowInput, doctorConsultationTypes: string[], organizationIds: Set<string>) {
  if (window.organizationId && !organizationIds.has(window.organizationId)) {
    throw badRequest('UNKNOWN_ORGANIZATION', 'You can only set hours for clinics you are attached to.');
  }
  if (window.consultationTypes.some((type) => !doctorConsultationTypes.includes(type))) {
    throw badRequest('CONSULTATION_TYPE_UNAVAILABLE', 'You can only offer consultation types enabled on your profile.');
  }
  const duration = toMinutes(window.endTime) - toMinutes(window.startTime);
  if (window.slotDurationMinutes > duration) {
    throw badRequest('SLOT_TOO_LONG', 'The slot duration cannot be longer than the working window.');
  }
  if (window.breakStartTime && window.breakEndTime) {
    if (toMinutes(window.breakStartTime) < toMinutes(window.startTime) || toMinutes(window.breakEndTime) > toMinutes(window.endTime)) {
      throw badRequest('BREAK_OUT_OF_RANGE', 'The break must fall within the working hours.');
    }
  }
}

export async function replaceMyAvailability(auth: AuthContext, input: ReplaceAvailabilityInput): Promise<DoctorAvailabilityState> {
  const doctorId = requireDoctorId(auth);
  const doctor = await prisma.doctor.findUniqueOrThrow({
    where: { id: doctorId },
    include: { organizations: { where: { isActive: true }, select: { organizationId: true } } },
  });
  const organizationIds = new Set(doctor.organizations.map((link) => link.organizationId));

  for (const window of input.windows) validateWindow(window, doctor.consultationTypes, organizationIds);

  // Two windows for the same clinic on the same day must not overlap, or the slot engine would offer the same time twice.
  const byGroup = new Map<string, AvailabilityWindowInput[]>();
  for (const window of input.windows) {
    const key = `${window.organizationId ?? 'independent'}|${window.dayOfWeek}`;
    byGroup.set(key, [...(byGroup.get(key) ?? []), window]);
  }
  for (const group of byGroup.values()) {
    const sorted = [...group].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    for (let i = 1; i < sorted.length; i++) {
      if (toMinutes(sorted[i].startTime) < toMinutes(sorted[i - 1].endTime)) {
        throw badRequest('OVERLAPPING_WINDOWS', 'Working hours for the same clinic and day cannot overlap.');
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.doctorAvailability.deleteMany({ where: { doctorId } });
    if (input.windows.length) {
      await tx.doctorAvailability.createMany({
        data: input.windows.map((window) => ({
          doctorId,
          organizationId: window.organizationId ?? null,
          dayOfWeek: window.dayOfWeek,
          startTime: window.startTime,
          endTime: window.endTime,
          breakStartTime: window.breakStartTime ?? null,
          breakEndTime: window.breakEndTime ?? null,
          slotDurationMinutes: window.slotDurationMinutes,
          consultationTypes: window.consultationTypes,
        })),
      });
    }
  });

  return getMyAvailability(auth);
}

export async function addBlockedDate(auth: AuthContext, input: BlockedDateInput) {
  const doctorId = requireDoctorId(auth);
  const date = new Date(`${input.date}T00:00:00Z`);
  const blocked = await prisma.doctorBlockedDate.upsert({
    where: { doctorId_date: { doctorId, date } },
    create: { doctorId, date, reason: input.reason ?? null },
    update: { reason: input.reason ?? null },
  });
  return { id: blocked.id, date: blocked.date.toISOString().slice(0, 10), reason: blocked.reason };
}

export async function removeBlockedDate(auth: AuthContext, id: string): Promise<void> {
  const doctorId = requireDoctorId(auth);
  const result = await prisma.doctorBlockedDate.deleteMany({ where: { id, doctorId } });
  if (result.count === 0) throw notFound('Blocked date');
}

// ── Dashboard & patients ─────────────────────────────────────

function ageFrom(dateOfBirth: Date | null): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const beforeBirthday = today.getUTCMonth() < dateOfBirth.getUTCMonth() || (today.getUTCMonth() === dateOfBirth.getUTCMonth() && today.getUTCDate() < dateOfBirth.getUTCDate());
  if (beforeBirthday) age--;
  return age;
}

type PatientEncounterRow = {
  patientId: string;
  scheduledStart: Date;
  status: AppointmentStatus;
  patient: { dateOfBirth: Date | null; gender: Gender | null; user: { firstName: string; lastName: string; avatarUrl: string | null } };
};

/**
 * One pass over every non-cancelled appointment the doctor has ever had, folded into a
 * per-patient summary. Demo data volumes are small (dozens of appointments per doctor), so this
 * is simpler and just as fast as a SQL GROUP BY here — the list below is paginated in memory.
 */
function summarizePatients(rows: PatientEncounterRow[]): DoctorPatientSummary[] {
  const now = Date.now();
  const byPatient = new Map<string, { row: PatientEncounterRow; totalVisits: number; lastVisitAt: Date | null; nextAppointmentAt: Date | null }>();

  for (const row of rows) {
    const entry = byPatient.get(row.patientId) ?? { row, totalVisits: 0, lastVisitAt: null, nextAppointmentAt: null };
    if (row.scheduledStart.getTime() <= now) {
      entry.totalVisits += 1;
      if (!entry.lastVisitAt || row.scheduledStart > entry.lastVisitAt) entry.lastVisitAt = row.scheduledStart;
    } else if ((ACTIVE_APPOINTMENT_STATUSES as readonly string[]).includes(row.status)) {
      if (!entry.nextAppointmentAt || row.scheduledStart < entry.nextAppointmentAt) entry.nextAppointmentAt = row.scheduledStart;
    }
    byPatient.set(row.patientId, entry);
  }

  return [...byPatient.entries()].map(([patientId, entry]) => ({
    patientId,
    name: `${entry.row.patient.user.firstName} ${entry.row.patient.user.lastName}`,
    avatarUrl: entry.row.patient.user.avatarUrl,
    age: ageFrom(entry.row.patient.dateOfBirth),
    gender: entry.row.patient.gender,
    totalVisits: entry.totalVisits,
    lastVisitAt: entry.lastVisitAt?.toISOString() ?? null,
    nextAppointmentAt: entry.nextAppointmentAt?.toISOString() ?? null,
  }));
}

async function loadPatientEncounters(doctorId: string): Promise<PatientEncounterRow[]> {
  return prisma.appointment.findMany({
    where: { doctorId, status: { notIn: NON_ENCOUNTER_STATUSES as AppointmentStatus[] } },
    select: {
      patientId: true,
      scheduledStart: true,
      status: true,
      patient: { select: { dateOfBirth: true, gender: true, user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
    },
    orderBy: { scheduledStart: 'asc' },
  });
}

export async function getDashboard(auth: AuthContext): Promise<DoctorDashboard> {
  const doctorId = requireDoctorId(auth);
  const now = new Date();
  const todayStart = istDateTime(0, '00:00', now);
  const tomorrowStart = istDateTime(1, '00:00', now);

  const [todayRows, upcomingRows, upcomingCount, waitingPatients, completedConsultationsToday, pendingNotes, encounters] = await Promise.all([
    prisma.appointment.findMany({
      where: { doctorId, scheduledStart: { gte: todayStart, lt: tomorrowStart }, status: { not: 'CANCELLED' } },
      include: appointmentInclude,
      orderBy: { scheduledStart: 'asc' },
    }),
    prisma.appointment.findMany({
      where: { doctorId, scheduledStart: { gte: now }, status: { in: ACTIVE_APPOINTMENT_STATUSES as AppointmentStatus[] } },
      include: appointmentInclude,
      orderBy: { scheduledStart: 'asc' },
      take: 8,
    }),
    prisma.appointment.count({ where: { doctorId, scheduledStart: { gte: now }, status: { in: ACTIVE_APPOINTMENT_STATUSES as AppointmentStatus[] } } }),
    prisma.appointment.count({ where: { doctorId, status: 'CHECKED_IN' } }),
    prisma.consultation.count({ where: { doctorId, status: 'COMPLETED', completedAt: { gte: todayStart, lt: tomorrowStart } } }),
    prisma.consultation.count({ where: { doctorId, status: 'IN_PROGRESS' } }),
    loadPatientEncounters(doctorId),
  ]);

  const patients = summarizePatients(encounters);
  const recentPatients = [...patients]
    .sort((a, b) => new Date(b.lastVisitAt ?? b.nextAppointmentAt ?? 0).getTime() - new Date(a.lastVisitAt ?? a.nextAppointmentAt ?? 0).getTime())
    .slice(0, 6);

  return {
    stats: {
      todayAppointments: todayRows.length,
      upcomingAppointments: upcomingCount,
      waitingPatients,
      completedConsultationsToday,
      totalPatients: patients.length,
      pendingNotes,
    },
    todaySchedule: todayRows.map((row) => toSummary(row, now)),
    upcomingAppointments: upcomingRows.map((row) => toSummary(row, now)),
    recentPatients,
  };
}

export async function listMyPatients(auth: AuthContext, query: ListMyPatientsQuery) {
  const doctorId = requireDoctorId(auth);
  const encounters = await loadPatientEncounters(doctorId);
  let patients = summarizePatients(encounters);

  if (query.q) {
    const needle = query.q.toLowerCase();
    patients = patients.filter((patient) => patient.name.toLowerCase().includes(needle));
  }

  patients =
    query.sort === 'name'
      ? [...patients].sort((a, b) => a.name.localeCompare(b.name))
      : [...patients].sort((a, b) => new Date(b.lastVisitAt ?? b.nextAppointmentAt ?? 0).getTime() - new Date(a.lastVisitAt ?? a.nextAppointmentAt ?? 0).getTime());

  const total = patients.length;
  const start = (query.page - 1) * query.pageSize;
  return { data: patients.slice(start, start + query.pageSize), total };
}

export async function getMyPatient(auth: AuthContext, patientId: string): Promise<DoctorPatientDetail> {
  const doctorId = requireDoctorId(auth);
  const now = new Date();

  const appointments = await prisma.appointment.findMany({
    where: { doctorId, patientId },
    include: appointmentInclude,
    orderBy: { scheduledStart: 'desc' },
  });
  if (!appointments.length) throw forbidden('This patient is not assigned to you.', 'PATIENT_ACCESS_DENIED');

  const patient = await prisma.patient.findUniqueOrThrow({
    where: { id: patientId },
    select: { dateOfBirth: true, gender: true, bloodGroup: true, user: { select: { firstName: true, lastName: true, avatarUrl: true, phone: true } } },
  });

  const nonCancelled = appointments.filter((appointment) => appointment.status !== 'CANCELLED');
  const past = nonCancelled.filter((appointment) => appointment.scheduledStart.getTime() <= now.getTime());
  const nextUpcoming = nonCancelled
    .filter((appointment) => appointment.scheduledStart.getTime() > now.getTime() && (ACTIVE_APPOINTMENT_STATUSES as readonly string[]).includes(appointment.status))
    .sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime())[0];
  const lastVisit = past.sort((a, b) => b.scheduledStart.getTime() - a.scheduledStart.getTime())[0];

  return {
    patientId,
    name: `${patient.user.firstName} ${patient.user.lastName}`,
    avatarUrl: patient.user.avatarUrl,
    age: ageFrom(patient.dateOfBirth),
    gender: patient.gender,
    phone: patient.user.phone,
    bloodGroup: patient.bloodGroup,
    totalVisits: past.length,
    lastVisitAt: lastVisit?.scheduledStart.toISOString() ?? null,
    nextAppointmentAt: nextUpcoming?.scheduledStart.toISOString() ?? null,
    appointments: appointments.map((row) => toSummary(row, now)),
  };
}

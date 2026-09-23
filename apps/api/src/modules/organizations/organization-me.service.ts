import type { Prisma } from '@prisma/client';
import {
  DEMO_PASSWORD,
  type OrganizationDashboard,
  type OrganizationDoctor,
  type OrganizationPatient,
  type OrganizationPortalProfile,
  type OrganizationReport,
  type OrganizationScheduleWindow,
  type OrganizationServiceRecord,
  type OrganizationStaffMember,
} from '@carebridge/shared';
import { prisma } from '../../config/prisma';
import { hashPassword } from '../auth/password';
import { ageFrom } from '../../utils/age';
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors';
import { istDateTime, istParts } from '../../utils/time';
import type { AuthContext } from '../../types/auth';
import type {
  AssociateDoctorInput, CreateStaffInput, SaveServiceInput, ScheduleWindowInput,
  UpdateDoctorLinkInput, UpdateOrganizationProfileInput, UpdateStaffInput,
} from './organization-me.schemas';

type Membership = AuthContext['memberships'][number];

function membershipFor(auth: AuthContext, requestedId?: string): Membership {
  const membership = requestedId
    ? auth.memberships.find((item) => item.organizationId === requestedId)
    : auth.memberships.find((item) => item.organizationType === 'CLINIC' || item.organizationType === 'HOSPITAL');
  if (!membership || membership.organizationType === 'PHARMACY') {
    throw forbidden('You do not have access to this clinic or hospital.', 'ORGANIZATION_ACCESS_DENIED');
  }
  return membership;
}

const profileSelect = {
  id: true, type: true, name: true, slug: true, category: true, description: true, logoUrl: true,
  phone: true, email: true, website: true, addressLine1: true, addressLine2: true, locality: true,
  city: true, state: true, postalCode: true, opensAt: true, closesAt: true, is24Hours: true,
  openDays: true, approvalStatus: true, isActive: true,
} satisfies Prisma.OrganizationSelect;

export async function getProfile(auth: AuthContext, organizationId?: string): Promise<OrganizationPortalProfile> {
  const membership = membershipFor(auth, organizationId);
  return prisma.organization.findUniqueOrThrow({ where: { id: membership.organizationId }, select: profileSelect });
}

export async function updateProfile(auth: AuthContext, input: UpdateOrganizationProfileInput, organizationId?: string) {
  const membership = membershipFor(auth, organizationId);
  return prisma.organization.update({ where: { id: membership.organizationId }, data: input, select: profileSelect });
}

const doctorInclude = {
  doctor: {
    include: {
      user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
      specialties: { include: { specialty: { select: { name: true } } }, orderBy: { isPrimary: 'desc' as const } },
    },
  },
} satisfies Prisma.DoctorOrganizationInclude;

type DoctorLinkRow = Prisma.DoctorOrganizationGetPayload<{ include: typeof doctorInclude }>;
function doctorDto(link: DoctorLinkRow): OrganizationDoctor {
  return {
    linkId: link.id, doctorId: link.doctorId,
    name: `Dr. ${link.doctor.user.firstName} ${link.doctor.user.lastName}`,
    email: link.doctor.user.email, avatarUrl: link.doctor.user.avatarUrl,
    qualifications: link.doctor.qualifications,
    specialties: link.doctor.specialties.map((item) => item.specialty.name), title: link.title,
    consultationFee: Number(link.consultationFee ?? link.doctor.consultationFee),
    isPrimary: link.isPrimary, isActive: link.isActive, approvalStatus: link.doctor.approvalStatus,
  };
}

export async function listDoctors(auth: AuthContext, organizationId?: string): Promise<OrganizationDoctor[]> {
  const { organizationId: id } = membershipFor(auth, organizationId);
  const rows = await prisma.doctorOrganization.findMany({ where: { organizationId: id }, include: doctorInclude, orderBy: [{ isActive: 'desc' }, { doctor: { user: { firstName: 'asc' } } }] });
  return rows.map(doctorDto);
}

export async function associateDoctor(auth: AuthContext, input: AssociateDoctorInput, organizationId?: string) {
  const { organizationId: id } = membershipFor(auth, organizationId);
  const doctor = await prisma.doctor.findFirst({ where: { user: { email: input.email.toLowerCase() } }, select: { id: true } });
  if (!doctor) throw notFound('Doctor', 'DOCTOR_EMAIL_NOT_FOUND');
  const link = await prisma.doctorOrganization.upsert({
    where: { doctorId_organizationId: { doctorId: doctor.id, organizationId: id } },
    create: { doctorId: doctor.id, organizationId: id, title: input.title, consultationFee: input.consultationFee, isPrimary: input.isPrimary ?? false },
    update: { title: input.title, consultationFee: input.consultationFee, isPrimary: input.isPrimary, isActive: true },
    include: doctorInclude,
  });
  return doctorDto(link);
}

export async function updateDoctor(auth: AuthContext, doctorId: string, input: UpdateDoctorLinkInput, organizationId?: string) {
  const { organizationId: id } = membershipFor(auth, organizationId);
  const existing = await prisma.doctorOrganization.findUnique({ where: { doctorId_organizationId: { doctorId, organizationId: id } } });
  if (!existing) throw notFound('Organization doctor');
  const link = await prisma.doctorOrganization.update({ where: { id: existing.id }, data: input, include: doctorInclude });
  return doctorDto(link);
}

const staffInclude = { user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } } } satisfies Prisma.OrganizationStaffInclude;
type StaffRow = Prisma.OrganizationStaffGetPayload<{ include: typeof staffInclude }>;
function staffDto(row: StaffRow): OrganizationStaffMember {
  return { membershipId: row.id, userId: row.userId, name: `${row.user.firstName} ${row.user.lastName}`, email: row.user.email, phone: row.user.phone,
    avatarUrl: row.user.avatarUrl, staffRole: row.staffRole, title: row.title, joinedAt: row.joinedAt.toISOString(), isActive: row.isActive };
}

export async function listStaff(auth: AuthContext, organizationId?: string): Promise<OrganizationStaffMember[]> {
  const { organizationId: id } = membershipFor(auth, organizationId);
  return (await prisma.organizationStaff.findMany({ where: { organizationId: id }, include: staffInclude, orderBy: [{ isActive: 'desc' }, { joinedAt: 'asc' }] })).map(staffDto);
}

export async function createStaff(auth: AuthContext, input: CreateStaffInput, organizationId?: string) {
  const membership = membershipFor(auth, organizationId);
  const email = input.email.toLowerCase();
  const roleName = membership.organizationType === 'CLINIC'
    ? (input.staffRole === 'ADMIN' ? 'CLINIC_ADMIN' : 'CLINIC_STAFF')
    : (input.staffRole === 'ADMIN' ? 'HOSPITAL_ADMIN' : 'HOSPITAL_STAFF');
  const existingMembership = await prisma.organizationStaff.findFirst({ where: { organizationId: membership.organizationId, user: { email } } });
  if (existingMembership) throw conflict('STAFF_ALREADY_EXISTS', 'This person is already attached to the organization.');
  const passwordHash = await hashPassword(input.password ?? DEMO_PASSWORD);
  const row = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      create: { email, firstName: input.firstName, lastName: input.lastName, phone: input.phone, passwordHash },
      update: {},
    });
    const role = await tx.role.findUniqueOrThrow({ where: { name: roleName } });
    await tx.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, create: { userId: user.id, roleId: role.id }, update: {} });
    return tx.organizationStaff.create({ data: { organizationId: membership.organizationId, userId: user.id, staffRole: input.staffRole, title: input.title }, include: staffInclude });
  });
  return staffDto(row);
}

export async function updateStaff(auth: AuthContext, membershipId: string, input: UpdateStaffInput, organizationId?: string) {
  const { organizationId: id } = membershipFor(auth, organizationId);
  const existing = await prisma.organizationStaff.findFirst({ where: { id: membershipId, organizationId: id }, include: { organization: { select: { type: true } } } });
  if (!existing) throw notFound('Staff member');
  if (existing.userId === auth.userId && input.isActive === false) throw badRequest('CANNOT_DEACTIVATE_SELF', 'You cannot deactivate your own membership.');
  const row = await prisma.$transaction(async (tx) => {
    if (input.staffRole && input.staffRole !== existing.staffRole) {
      const prefix = existing.organization.type === 'CLINIC' ? 'CLINIC' : 'HOSPITAL';
      const oldRole = await tx.role.findUniqueOrThrow({ where: { name: `${prefix}_${existing.staffRole}` as 'CLINIC_ADMIN' } });
      const newRole = await tx.role.findUniqueOrThrow({ where: { name: `${prefix}_${input.staffRole}` as 'CLINIC_ADMIN' } });
      await tx.userRole.upsert({ where: { userId_roleId: { userId: existing.userId, roleId: newRole.id } }, create: { userId: existing.userId, roleId: newRole.id }, update: {} });
      const otherMembership = await tx.organizationStaff.findFirst({ where: { userId: existing.userId, id: { not: membershipId }, isActive: true, staffRole: existing.staffRole, organization: { type: existing.organization.type } } });
      if (!otherMembership) await tx.userRole.deleteMany({ where: { userId: existing.userId, roleId: oldRole.id } });
    }
    return tx.organizationStaff.update({ where: { id: membershipId }, data: input, include: staffInclude });
  });
  return staffDto(row);
}

function serviceDto(row: Prisma.OrganizationServiceGetPayload<{ include: { specialty: true } }>): OrganizationServiceRecord {
  return { id: row.id, name: row.name, description: row.description, price: row.price === null ? null : Number(row.price), durationMinutes: row.durationMinutes,
    specialtyId: row.specialtyId, specialtyName: row.specialty?.name ?? null, isActive: row.isActive };
}
export async function listServices(auth: AuthContext, organizationId?: string) {
  const { organizationId: id } = membershipFor(auth, organizationId);
  return (await prisma.organizationService.findMany({ where: { organizationId: id }, include: { specialty: true }, orderBy: [{ isActive: 'desc' }, { name: 'asc' }] })).map(serviceDto);
}
export async function createService(auth: AuthContext, input: SaveServiceInput, organizationId?: string) {
  const { organizationId: id } = membershipFor(auth, organizationId);
  return serviceDto(await prisma.organizationService.create({ data: { organizationId: id, ...input }, include: { specialty: true } }));
}
export async function updateService(auth: AuthContext, serviceId: string, input: SaveServiceInput, organizationId?: string) {
  const { organizationId: id } = membershipFor(auth, organizationId);
  const existing = await prisma.organizationService.findFirst({ where: { id: serviceId, organizationId: id } });
  if (!existing) throw notFound('Service');
  return serviceDto(await prisma.organizationService.update({ where: { id: serviceId }, data: input, include: { specialty: true } }));
}

export async function listPatients(auth: AuthContext, organizationId?: string): Promise<OrganizationPatient[]> {
  const { organizationId: id } = membershipFor(auth, organizationId);
  const rows = await prisma.appointment.findMany({
    where: { organizationId: id, status: { not: 'CANCELLED' } }, orderBy: { scheduledStart: 'asc' },
    select: { patientId: true, scheduledStart: true, status: true, patient: { select: { dateOfBirth: true, gender: true, user: { select: { firstName: true, lastName: true, phone: true, avatarUrl: true } } } } },
  });
  const now = Date.now();
  const grouped = new Map<string, OrganizationPatient>();
  for (const row of rows) {
    const value = grouped.get(row.patientId) ?? { patientId: row.patientId, name: `${row.patient.user.firstName} ${row.patient.user.lastName}`, avatarUrl: row.patient.user.avatarUrl,
      age: ageFrom(row.patient.dateOfBirth), gender: row.patient.gender, phone: row.patient.user.phone, totalVisits: 0, lastVisitAt: null, nextAppointmentAt: null };
    if (row.scheduledStart.getTime() <= now) { value.totalVisits++; if (!value.lastVisitAt || row.scheduledStart > new Date(value.lastVisitAt)) value.lastVisitAt = row.scheduledStart.toISOString(); }
    else if (['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION'].includes(row.status)) { if (!value.nextAppointmentAt || row.scheduledStart < new Date(value.nextAppointmentAt)) value.nextAppointmentAt = row.scheduledStart.toISOString(); }
    grouped.set(row.patientId, value);
  }
  return [...grouped.values()].sort((a, b) => (b.lastVisitAt ?? b.nextAppointmentAt ?? '').localeCompare(a.lastVisitAt ?? a.nextAppointmentAt ?? ''));
}

export async function listSchedules(auth: AuthContext, organizationId?: string): Promise<OrganizationScheduleWindow[]> {
  const { organizationId: id } = membershipFor(auth, organizationId);
  const rows = await prisma.doctorAvailability.findMany({ where: { organizationId: id }, include: { doctor: { include: { user: { select: { firstName: true, lastName: true } } } } }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] });
  return rows.map((row) => ({ id: row.id, doctorId: row.doctorId, doctorName: `Dr. ${row.doctor.user.firstName} ${row.doctor.user.lastName}`, dayOfWeek: row.dayOfWeek,
    startTime: row.startTime, endTime: row.endTime, breakStartTime: row.breakStartTime, breakEndTime: row.breakEndTime,
    slotDurationMinutes: row.slotDurationMinutes, consultationTypes: row.consultationTypes, isActive: row.isActive }));
}

const minutes = (value: string) => { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; };
export async function replaceDoctorSchedule(auth: AuthContext, doctorId: string, windows: ScheduleWindowInput[], organizationId?: string) {
  const { organizationId: id } = membershipFor(auth, organizationId);
  const link = await prisma.doctorOrganization.findUnique({ where: { doctorId_organizationId: { doctorId, organizationId: id } }, include: { doctor: true } });
  if (!link || !link.isActive) throw notFound('Organization doctor');
  for (const window of windows) {
    if (minutes(window.startTime) >= minutes(window.endTime)) throw badRequest('INVALID_SCHEDULE', 'Schedule end time must be after its start time.');
    if (window.breakStartTime && window.breakEndTime && (minutes(window.breakStartTime) < minutes(window.startTime) || minutes(window.breakEndTime) > minutes(window.endTime) || minutes(window.breakStartTime) >= minutes(window.breakEndTime))) {
      throw badRequest('INVALID_SCHEDULE_BREAK', 'Schedule breaks must fall inside working hours.');
    }
    if (window.consultationTypes.some((type) => !link.doctor.consultationTypes.includes(type))) throw badRequest('CONSULTATION_TYPE_UNAVAILABLE', 'The doctor does not offer one of the selected consultation types.');
  }
  for (const day of new Set(windows.map((window) => window.dayOfWeek))) {
    const sorted = windows.filter((window) => window.dayOfWeek === day).sort((a, b) => minutes(a.startTime) - minutes(b.startTime));
    for (let index = 1; index < sorted.length; index++) {
      if (minutes(sorted[index].startTime) < minutes(sorted[index - 1].endTime)) throw badRequest('OVERLAPPING_WINDOWS', 'Working hours for the same day cannot overlap.');
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.doctorAvailability.deleteMany({ where: { doctorId, organizationId: id } });
    if (windows.length) await tx.doctorAvailability.createMany({ data: windows.map((window) => ({ doctorId, organizationId: id, ...window })) });
  });
  return listSchedules(auth, id);
}

function dayLabel(date: Date) { return date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' }); }

export async function getDashboard(auth: AuthContext, organizationId?: string): Promise<OrganizationDashboard> {
  const membership = membershipFor(auth, organizationId); const id = membership.organizationId;
  const today = istDateTime(0, '00:00'); const tomorrow = istDateTime(1, '00:00'); const weekStart = istDateTime(-6, '00:00');
  const [org, todayRows, doctors, allPatientRows, completedCount, completedFees, trendRows, schedules] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id }, select: { id: true, name: true, type: true, approvalStatus: true } }),
    prisma.appointment.findMany({ where: { organizationId: id, scheduledStart: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } }, orderBy: { scheduledStart: 'asc' }, select: { id: true, appointmentNumber: true, scheduledStart: true, status: true, consultationType: true, patient: { select: { user: { select: { firstName: true, lastName: true } } } }, doctor: { select: { user: { select: { firstName: true, lastName: true } } } } } }),
    prisma.doctorOrganization.findMany({ where: { organizationId: id, isActive: true, doctor: { isActive: true } }, select: { doctorId: true, doctor: { select: { user: { select: { firstName: true, lastName: true } } } } } }),
    prisma.appointment.findMany({ where: { organizationId: id, status: { not: 'CANCELLED' } }, distinct: ['patientId'], select: { patientId: true } }),
    prisma.appointment.count({ where: { organizationId: id, status: 'COMPLETED' } }),
    prisma.appointment.aggregate({ where: { organizationId: id, status: 'COMPLETED' }, _sum: { fee: true } }),
    prisma.appointment.findMany({ where: { organizationId: id, scheduledStart: { gte: weekStart, lt: tomorrow }, status: { not: 'CANCELLED' } }, select: { scheduledStart: true } }),
    prisma.doctorAvailability.findMany({ where: { organizationId: id, dayOfWeek: istParts(new Date()).dayOfWeek, isActive: true }, select: { doctorId: true, startTime: true, endTime: true } }),
  ]);
  const trend = Array.from({ length: 7 }, (_, index) => { const start = istDateTime(index - 6, '00:00'); const end = istDateTime(index - 5, '00:00'); return { label: dayLabel(start), total: trendRows.filter((row) => row.scheduledStart >= start && row.scheduledStart < end).length }; });
  return { organization: org, stats: { todayAppointments: todayRows.length, activeDoctors: doctors.length, totalPatients: allPatientRows.length, completedConsultations: completedCount, revenue: Number(completedFees._sum.fee ?? 0) },
    todayAppointments: todayRows.map((row) => ({ id: row.id, appointmentNumber: row.appointmentNumber, scheduledStart: row.scheduledStart.toISOString(), status: row.status, consultationType: row.consultationType, patientName: `${row.patient.user.firstName} ${row.patient.user.lastName}`, doctorName: `Dr. ${row.doctor.user.firstName} ${row.doctor.user.lastName}` })),
    doctorAvailability: doctors.map((row) => { const windows = schedules.filter((window) => window.doctorId === row.doctorId); return { doctorId: row.doctorId, doctorName: `Dr. ${row.doctor.user.firstName} ${row.doctor.user.lastName}`, status: windows.length ? 'AVAILABLE' as const : 'OFF_DUTY' as const, hours: windows.length ? windows.map((window) => `${window.startTime}–${window.endTime}`).join(', ') : null }; }), appointmentTrend: trend };
}

export async function getReport(auth: AuthContext, requested: { organizationId?: string; from?: string; to?: string }): Promise<OrganizationReport> {
  const { organizationId: id } = membershipFor(auth, requested.organizationId);
  const to = requested.to ? new Date(`${requested.to}T23:59:59.999Z`) : new Date();
  const from = requested.from ? new Date(`${requested.from}T00:00:00.000Z`) : new Date(to.getTime() - 29 * 86_400_000);
  if (from > to) throw badRequest('INVALID_REPORT_RANGE', 'The report start date must be before the end date.');
  const rows = await prisma.appointment.findMany({ where: { organizationId: id, scheduledStart: { gte: from, lte: to } }, orderBy: { scheduledStart: 'asc' }, select: { scheduledStart: true, status: true, fee: true, doctorId: true, doctor: { select: { user: { select: { firstName: true, lastName: true } } } } } });
  const byDay = new Map<string, { total: number; completed: number }>(); const byDoctor = new Map<string, OrganizationReport['doctorPerformance'][number]>();
  for (const row of rows) {
    const label = dayLabel(row.scheduledStart); const day = byDay.get(label) ?? { total: 0, completed: 0 }; day.total++; if (row.status === 'COMPLETED') day.completed++; byDay.set(label, day);
    const doctor = byDoctor.get(row.doctorId) ?? { doctorId: row.doctorId, doctorName: `Dr. ${row.doctor.user.firstName} ${row.doctor.user.lastName}`, appointments: 0, completed: 0, revenue: 0 };
    doctor.appointments++; if (row.status === 'COMPLETED') { doctor.completed++; doctor.revenue += Number(row.fee); } byDoctor.set(row.doctorId, doctor);
  }
  return { period: { from: from.toISOString(), to: to.toISOString() }, totals: { appointments: rows.length, completed: rows.filter((r) => r.status === 'COMPLETED').length, cancelled: rows.filter((r) => r.status === 'CANCELLED').length, noShows: rows.filter((r) => r.status === 'NO_SHOW').length, revenue: rows.filter((r) => r.status === 'COMPLETED').reduce((sum, row) => sum + Number(row.fee), 0) },
    appointmentTrend: [...byDay].map(([label, value]) => ({ label, ...value })), doctorPerformance: [...byDoctor.values()].sort((a, b) => b.appointments - a.appointments) };
}

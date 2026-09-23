import type { Prisma, RoleName } from '@prisma/client';
import {
  DEMO_PASSWORD,
  type AdminActivity, type AdminAppointment, type AdminApproval, type AdminDoctor, type AdminEmployee,
  type AdminOrder, type AdminOrganization, type AdminOverview, type AdminPatient, type AdminReport, type AdminSetting,
} from '@carebridge/shared';
import { prisma } from '../../config/prisma';
import type { AuthContext } from '../../types/auth';
import { ACTIVITY, logActivity } from '../../services/activity-log.service';
import { notify, organizationRecipientIds } from '../../services/notification.service';
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors';
import { toSkipTake } from '../../utils/http';
import { availableSlug } from '../../utils/slug';
import { hashPassword } from '../auth/password';
import type { CreateAdminOrganizationPayload } from '@carebridge/shared';
import type { CreateEmployeeInput, UpdateEmployeeInput } from './admin.schemas';

type PageQuery = { page: number; pageSize: number; q?: string };
const dateRange = (from?: string, to?: string, defaultDays = 29) => {
  const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
  const start = from ? new Date(`${from}T00:00:00.000Z`) : new Date(end.getTime() - defaultDays * 86_400_000);
  if (start > end) throw badRequest('INVALID_DATE_RANGE', 'The start date must be before the end date.');
  return { start, end };
};
const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const dayLabel = (date: Date) => date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const name = (user: { firstName: string; lastName: string }) => `${user.firstName} ${user.lastName}`;

const organizationInclude = { _count: { select: { doctors: true, staff: true, orders: true, appointments: true } } } satisfies Prisma.OrganizationInclude;
type OrganizationRow = Prisma.OrganizationGetPayload<{ include: typeof organizationInclude }>;
const organizationDto = (row: OrganizationRow): AdminOrganization => ({
  id: row.id, name: row.name, slug: row.slug, type: row.type, category: row.category, contactPerson: row.contactPerson,
  phone: row.phone, email: row.email, locality: row.locality, city: row.city, registrationNumber: row.registrationNumber,
  licenseNumber: row.licenseNumber, approvalStatus: row.approvalStatus, rejectionReason: row.rejectionReason,
  isActive: row.isActive, doctorCount: row._count.doctors, staffCount: row._count.staff, orderCount: row._count.orders,
  appointmentCount: row._count.appointments, createdAt: row.createdAt.toISOString(),
});

export async function listOrganizations(query: PageQuery & { type?: 'CLINIC' | 'HOSPITAL' | 'PHARMACY'; approvalStatus?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'; isActive?: boolean }) {
  const where: Prisma.OrganizationWhereInput = {
    ...(query.type ? { type: query.type } : {}), ...(query.approvalStatus ? { approvalStatus: query.approvalStatus } : {}), ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { email: { contains: query.q, mode: 'insensitive' } }, { registrationNumber: { contains: query.q, mode: 'insensitive' } }, { locality: { contains: query.q, mode: 'insensitive' } }] } : {}),
  };
  const [rows, total] = await prisma.$transaction([prisma.organization.findMany({ where, include: organizationInclude, orderBy: { createdAt: 'desc' }, ...toSkipTake(query) }), prisma.organization.count({ where })]);
  return { data: rows.map(organizationDto), total };
}
export async function getOrganization(id: string) { const row = await prisma.organization.findUnique({ where: { id }, include: organizationInclude }); if (!row) throw notFound('Organization'); return organizationDto(row); }
export async function createOrganization(auth: AuthContext, input: CreateAdminOrganizationPayload, ipAddress?: string) {
  const slug = await availableSlug(input.name, async (candidate) => Boolean(await prisma.organization.findUnique({ where: { slug: candidate }, select: { id: true } })));
  const row = await prisma.organization.create({ data: { ...input, slug, approvalStatus: 'APPROVED', approvedAt: new Date(), isActive: true, openDays: [1, 2, 3, 4, 5, 6], acceptsPrescriptions: input.type === 'PHARMACY', pickupAvailable: input.type === 'PHARMACY' }, include: organizationInclude });
  await logActivity({ action: ACTIVITY.ORGANIZATION_APPROVED, entityType: 'Organization', entityId: row.id, organizationId: row.id, actorUserId: auth.userId, description: `Created and approved ${row.name}`, ipAddress });
  return organizationDto(row);
}

const doctorInclude = { user: true, specialties: { include: { specialty: true }, orderBy: { isPrimary: 'desc' as const } }, organizations: { where: { isActive: true }, include: { organization: { select: { name: true } } } }, _count: { select: { appointments: true } } } satisfies Prisma.DoctorInclude;
type DoctorRow = Prisma.DoctorGetPayload<{ include: typeof doctorInclude }>;
const doctorDto = (row: DoctorRow): AdminDoctor => ({ id: row.id, userId: row.userId, name: `Dr. ${name(row.user)}`, email: row.user.email, phone: row.user.phone, avatarUrl: row.user.avatarUrl, registrationNumber: row.registrationNumber, qualifications: row.qualifications,
  experienceYears: row.experienceYears, specialties: row.specialties.map((item) => item.specialty.name), consultationFee: Number(row.consultationFee), approvalStatus: row.approvalStatus, rejectionReason: row.rejectionReason,
  isActive: row.isActive, userStatus: row.user.status, organizations: row.organizations.map((item) => item.organization.name), appointmentCount: row._count.appointments, createdAt: row.createdAt.toISOString() });
export async function listDoctors(query: PageQuery & { approvalStatus?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'; isActive?: boolean }) {
  const where: Prisma.DoctorWhereInput = { ...(query.approvalStatus ? { approvalStatus: query.approvalStatus } : {}), ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.q ? { OR: [{ user: { firstName: { contains: query.q, mode: 'insensitive' } } }, { user: { lastName: { contains: query.q, mode: 'insensitive' } } }, { user: { email: { contains: query.q, mode: 'insensitive' } } }, { registrationNumber: { contains: query.q, mode: 'insensitive' } }] } : {}) };
  const [rows, total] = await prisma.$transaction([prisma.doctor.findMany({ where, include: doctorInclude, orderBy: { createdAt: 'desc' }, ...toSkipTake(query) }), prisma.doctor.count({ where })]); return { data: rows.map(doctorDto), total };
}
export async function getDoctor(id: string) { const row = await prisma.doctor.findUnique({ where: { id }, include: doctorInclude }); if (!row) throw notFound('Doctor'); return doctorDto(row); }

const patientInclude = { user: true, _count: { select: { appointments: true, orders: true } } } satisfies Prisma.PatientInclude;
type PatientRow = Prisma.PatientGetPayload<{ include: typeof patientInclude }>;
const patientDto = (row: PatientRow): AdminPatient => ({ id: row.id, userId: row.userId, patientCode: row.patientCode, name: name(row.user), email: row.user.email, phone: row.user.phone, dateOfBirth: row.dateOfBirth?.toISOString().slice(0, 10) ?? null,
  gender: row.gender, bloodGroup: row.bloodGroup, status: row.user.status, appointmentCount: row._count.appointments, orderCount: row._count.orders, createdAt: row.createdAt.toISOString() });
export async function listPatients(query: PageQuery & { status?: 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL' }) {
  const where: Prisma.PatientWhereInput = { ...(query.status ? { user: { status: query.status } } : {}), ...(query.q ? { OR: [{ patientCode: { contains: query.q, mode: 'insensitive' } }, { user: { firstName: { contains: query.q, mode: 'insensitive' } } }, { user: { lastName: { contains: query.q, mode: 'insensitive' } } }, { user: { email: { contains: query.q, mode: 'insensitive' } } }, { user: { phone: { contains: query.q } } }] } : {}) };
  const [rows, total] = await prisma.$transaction([prisma.patient.findMany({ where, include: patientInclude, orderBy: { createdAt: 'desc' }, ...toSkipTake(query) }), prisma.patient.count({ where })]); return { data: rows.map(patientDto), total };
}
export async function getPatient(id: string) { const row = await prisma.patient.findUnique({ where: { id }, include: patientInclude }); if (!row) throw notFound('Patient'); return patientDto(row); }

const appointmentSelect = { id: true, appointmentNumber: true, status: true, consultationType: true, fee: true, scheduledStart: true, createdAt: true, patient: { select: { user: { select: { firstName: true, lastName: true } } } }, doctor: { select: { user: { select: { firstName: true, lastName: true } } } }, organization: { select: { name: true } } } satisfies Prisma.AppointmentSelect;
type AppointmentRow = Prisma.AppointmentGetPayload<{ select: typeof appointmentSelect }>;
const appointmentDto = (row: AppointmentRow): AdminAppointment => ({ id: row.id, appointmentNumber: row.appointmentNumber, patientName: name(row.patient.user), doctorName: `Dr. ${name(row.doctor.user)}`, organizationName: row.organization?.name ?? null, consultationType: row.consultationType, status: row.status, fee: Number(row.fee), scheduledStart: row.scheduledStart.toISOString(), createdAt: row.createdAt.toISOString() });
export async function listAppointments(query: PageQuery & { status?: AdminAppointment['status']; consultationType?: AdminAppointment['consultationType']; from?: string; to?: string }) {
  const range = query.from || query.to ? dateRange(query.from, query.to) : null;
  const where: Prisma.AppointmentWhereInput = { ...(query.status ? { status: query.status } : {}), ...(query.consultationType ? { consultationType: query.consultationType } : {}), ...(range ? { scheduledStart: { gte: range.start, lte: range.end } } : {}), ...(query.q ? { OR: [{ appointmentNumber: { contains: query.q, mode: 'insensitive' } }, { patient: { user: { firstName: { contains: query.q, mode: 'insensitive' } } } }, { patient: { user: { lastName: { contains: query.q, mode: 'insensitive' } } } }, { doctor: { user: { firstName: { contains: query.q, mode: 'insensitive' } } } }, { doctor: { user: { lastName: { contains: query.q, mode: 'insensitive' } } } }] } : {}) };
  const [rows, total] = await prisma.$transaction([prisma.appointment.findMany({ where, select: appointmentSelect, orderBy: { scheduledStart: 'desc' }, ...toSkipTake(query) }), prisma.appointment.count({ where })]); return { data: rows.map(appointmentDto), total };
}

const orderSelect = { id: true, orderNumber: true, status: true, fulfillmentType: true, totalAmount: true, placedAt: true, patient: { select: { user: { select: { firstName: true, lastName: true } } } }, pharmacy: { select: { name: true } }, _count: { select: { items: true } }, payments: { orderBy: { createdAt: 'desc' as const }, take: 1, select: { status: true } } } satisfies Prisma.OrderSelect;
type OrderRow = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;
const orderDto = (row: OrderRow): AdminOrder => ({ id: row.id, orderNumber: row.orderNumber, patientName: name(row.patient.user), pharmacyName: row.pharmacy.name, status: row.status, itemCount: row._count.items, totalAmount: Number(row.totalAmount), paymentStatus: row.payments[0]?.status ?? null, fulfillmentType: row.fulfillmentType, placedAt: row.placedAt.toISOString() });
export async function listOrders(query: PageQuery & { status?: AdminOrder['status']; pharmacyId?: string; from?: string; to?: string }) {
  const range = query.from || query.to ? dateRange(query.from, query.to) : null;
  const where: Prisma.OrderWhereInput = { ...(query.status ? { status: query.status } : {}), ...(query.pharmacyId ? { pharmacyId: query.pharmacyId } : {}), ...(range ? { placedAt: { gte: range.start, lte: range.end } } : {}), ...(query.q ? { OR: [{ orderNumber: { contains: query.q, mode: 'insensitive' } }, { patient: { user: { firstName: { contains: query.q, mode: 'insensitive' } } } }, { patient: { user: { lastName: { contains: query.q, mode: 'insensitive' } } } }, { pharmacy: { name: { contains: query.q, mode: 'insensitive' } } }] } : {}) };
  const [rows, total] = await prisma.$transaction([prisma.order.findMany({ where, select: orderSelect, orderBy: { placedAt: 'desc' }, ...toSkipTake(query) }), prisma.order.count({ where })]); return { data: rows.map(orderDto), total };
}

const approvalDocuments = (documents: Array<{ id: string; type: string; fileName: string; mimeType: string; sizeBytes: number }>) => documents;
export async function listApprovals(): Promise<AdminApproval[]> {
  const [doctors, organizations] = await Promise.all([
    prisma.doctor.findMany({ where: { approvalStatus: 'PENDING_APPROVAL' }, include: { user: true, specialties: { where: { isPrimary: true }, include: { specialty: true } } }, orderBy: { createdAt: 'asc' } }),
    prisma.organization.findMany({ where: { approvalStatus: 'PENDING_APPROVAL' }, include: { documents: { select: { id: true, type: true, fileName: true, mimeType: true, sizeBytes: true } }, staff: { where: { staffRole: 'ADMIN' }, take: 1, include: { user: true } } }, orderBy: { createdAt: 'asc' } }),
  ]);
  const doctorUserIds = doctors.map((doctor) => doctor.userId);
  const docs = await prisma.document.findMany({ where: { uploadedById: { in: doctorUserIds }, organizationId: null, patientId: null }, select: { id: true, uploadedById: true, type: true, fileName: true, mimeType: true, sizeBytes: true } });
  return [...doctors.map((doctor) => ({ id: doctor.id, entityType: 'DOCTOR' as const, name: `Dr. ${name(doctor.user)}`, subtitle: `${doctor.qualifications} · ${doctor.specialties[0]?.specialty.name ?? 'Doctor'}`, organizationType: null, submittedBy: doctor.user.email, submittedAt: doctor.createdAt.toISOString(), documents: approvalDocuments(docs.filter((doc) => doc.uploadedById === doctor.userId)) })),
    ...organizations.map((org) => ({ id: org.id, entityType: 'ORGANIZATION' as const, name: org.name, subtitle: [org.category, org.locality, org.city].filter(Boolean).join(' · '), organizationType: org.type, submittedBy: org.staff[0]?.user.email ?? org.email ?? 'Unknown', submittedAt: org.createdAt.toISOString(), documents: approvalDocuments(org.documents) }))].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}

export async function decideApproval(auth: AuthContext, entityType: 'doctor' | 'organization', id: string, decision: 'approve' | 'reject', reason: string | undefined, ipAddress?: string) {
  if (decision === 'reject' && !reason) throw badRequest('REASON_REQUIRED', 'A rejection reason is required.');
  const approved = decision === 'approve';
  if (entityType === 'doctor') {
    const doctor = await prisma.doctor.findUnique({ where: { id }, include: { user: true } }); if (!doctor) throw notFound('Doctor');
    await prisma.$transaction(async (tx) => {
      await tx.doctor.update({ where: { id }, data: { approvalStatus: approved ? 'APPROVED' : 'REJECTED', approvedAt: approved ? new Date() : null, rejectionReason: approved ? null : reason } });
      await notify({ userId: doctor.userId, type: approved ? 'REGISTRATION_APPROVED' : 'REGISTRATION_REJECTED', title: approved ? 'Doctor profile approved' : 'Doctor registration rejected', message: approved ? 'Your CareBridge doctor profile is now approved.' : `Your registration was not approved: ${reason}`, link: '/doctor/profile', entityType: 'Doctor', entityId: id }, tx);
      await logActivity({ action: approved ? ACTIVITY.DOCTOR_APPROVED : ACTIVITY.DOCTOR_REJECTED, entityType: 'Doctor', entityId: id, actorUserId: auth.userId, description: `${approved ? 'Approved' : 'Rejected'} Dr. ${name(doctor.user)}${reason ? `: ${reason}` : ''}`, ipAddress }, tx);
    }); return getDoctor(id);
  }
  const org = await prisma.organization.findUnique({ where: { id } }); if (!org) throw notFound('Organization');
  await prisma.$transaction(async (tx) => {
    await tx.organization.update({ where: { id }, data: { approvalStatus: approved ? 'APPROVED' : 'REJECTED', approvedAt: approved ? new Date() : null, rejectionReason: approved ? null : reason } });
    const recipients = await organizationRecipientIds(id, { adminOnly: true }, tx);
    await notify(recipients.map((userId) => ({ userId, type: approved ? 'REGISTRATION_APPROVED' : 'REGISTRATION_REJECTED', title: approved ? `${org.name} approved` : `${org.name} registration rejected`, message: approved ? 'Your organization is now approved on CareBridge.' : `The registration was not approved: ${reason}`, link: '/organization/profile', entityType: 'Organization', entityId: id })), tx);
    await logActivity({ action: approved ? ACTIVITY.ORGANIZATION_APPROVED : ACTIVITY.ORGANIZATION_REJECTED, entityType: 'Organization', entityId: id, organizationId: id, actorUserId: auth.userId, description: `${approved ? 'Approved' : 'Rejected'} ${org.name}${reason ? `: ${reason}` : ''}`, ipAddress }, tx);
  }); return getOrganization(id);
}

export async function updateUserStatus(auth: AuthContext, userId: string, status: 'ACTIVE' | 'INACTIVE', ipAddress?: string) {
  if (userId === auth.userId && status === 'INACTIVE') throw badRequest('CANNOT_DEACTIVATE_SELF', 'You cannot deactivate your own account.');
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } }); if (!user) throw notFound('User');
  if (user.roles.some((item) => item.role.name === 'SUPER_ADMIN') && !auth.roles.includes('SUPER_ADMIN')) throw forbidden('Only a super admin can modify a super admin account.');
  const updated = await prisma.user.update({ where: { id: userId }, data: { status } });
  await logActivity({ action: ACTIVITY.USER_STATUS_UPDATED, entityType: 'User', entityId: userId, actorUserId: auth.userId, description: `${status === 'ACTIVE' ? 'Activated' : 'Deactivated'} ${user.email}`, ipAddress });
  return { id: updated.id, status: updated.status };
}
export async function updateDoctorStatus(auth: AuthContext, id: string, isActive: boolean, ipAddress?: string) { const doctor = await prisma.doctor.findUnique({ where: { id }, include: { user: true } }); if (!doctor) throw notFound('Doctor'); await prisma.doctor.update({ where: { id }, data: { isActive } }); await logActivity({ action: ACTIVITY.ENTITY_STATUS_UPDATED, entityType: 'Doctor', entityId: id, actorUserId: auth.userId, description: `${isActive ? 'Activated' : 'Deactivated'} Dr. ${name(doctor.user)}`, ipAddress }); return getDoctor(id); }
export async function updateOrganizationStatus(auth: AuthContext, id: string, isActive: boolean, ipAddress?: string) { const org = await prisma.organization.findUnique({ where: { id } }); if (!org) throw notFound('Organization'); await prisma.organization.update({ where: { id }, data: { isActive } }); await logActivity({ action: ACTIVITY.ENTITY_STATUS_UPDATED, entityType: 'Organization', entityId: id, organizationId: id, actorUserId: auth.userId, description: `${isActive ? 'Activated' : 'Deactivated'} ${org.name}`, ipAddress }); return getOrganization(id); }

const employeeInclude = { user: { include: { roles: { include: { role: true } } } } } satisfies Prisma.PlatformEmployeeInclude;
type EmployeeRow = Prisma.PlatformEmployeeGetPayload<{ include: typeof employeeInclude }>;
const employeeDto = (row: EmployeeRow): AdminEmployee => ({ id: row.id, userId: row.userId, employeeCode: row.employeeCode, name: name(row.user), email: row.user.email, phone: row.user.phone, department: row.department, jobTitle: row.jobTitle,
  role: (row.user.roles.map((item) => item.role.name).find((role) => ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'PLATFORM_EMPLOYEE'].includes(role)) ?? 'PLATFORM_EMPLOYEE') as AdminEmployee['role'], isActive: row.isActive, userStatus: row.user.status, createdAt: row.createdAt.toISOString() });
export async function listEmployees(query: PageQuery) { const where: Prisma.PlatformEmployeeWhereInput = query.q ? { OR: [{ employeeCode: { contains: query.q, mode: 'insensitive' } }, { department: { contains: query.q, mode: 'insensitive' } }, { jobTitle: { contains: query.q, mode: 'insensitive' } }, { user: { firstName: { contains: query.q, mode: 'insensitive' } } }, { user: { lastName: { contains: query.q, mode: 'insensitive' } } }, { user: { email: { contains: query.q, mode: 'insensitive' } } }] } : {}; const [rows, total] = await prisma.$transaction([prisma.platformEmployee.findMany({ where, include: employeeInclude, orderBy: { createdAt: 'asc' }, ...toSkipTake(query) }), prisma.platformEmployee.count({ where })]); return { data: rows.map(employeeDto), total }; }
export async function createEmployee(auth: AuthContext, input: CreateEmployeeInput, ipAddress?: string) {
  if (await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } })) throw conflict('EMAIL_IN_USE', 'An account with this email already exists.');
  if (await prisma.platformEmployee.findUnique({ where: { employeeCode: input.employeeCode } })) throw conflict('EMPLOYEE_CODE_IN_USE', 'That employee code is already in use.');
  const passwordHash = await hashPassword(input.password ?? DEMO_PASSWORD);
  const row = await prisma.$transaction(async (tx) => { const role = await tx.role.findUniqueOrThrow({ where: { name: input.role } }); const user = await tx.user.create({ data: { email: input.email.toLowerCase(), passwordHash, firstName: input.firstName, lastName: input.lastName, phone: input.phone, roles: { create: { roleId: role.id } } } }); const employee = await tx.platformEmployee.create({ data: { userId: user.id, employeeCode: input.employeeCode, department: input.department, jobTitle: input.jobTitle }, include: employeeInclude }); await logActivity({ action: ACTIVITY.EMPLOYEE_CREATED, entityType: 'PlatformEmployee', entityId: employee.id, actorUserId: auth.userId, description: `Created employee ${name(user)} (${input.employeeCode})`, ipAddress }, tx); return employee; }); return employeeDto(row);
}
export async function updateEmployee(auth: AuthContext, id: string, input: UpdateEmployeeInput, ipAddress?: string) {
  const existing = await prisma.platformEmployee.findUnique({ where: { id }, include: employeeInclude }); if (!existing) throw notFound('Employee');
  if (existing.userId === auth.userId && input.isActive === false) throw badRequest('CANNOT_DEACTIVATE_SELF', 'You cannot deactivate your own employee account.');
  if (employeeDto(existing).role === 'SUPER_ADMIN' && !auth.roles.includes('SUPER_ADMIN')) throw forbidden('Only a super admin can modify a super admin.');
  const row = await prisma.$transaction(async (tx) => {
    if (input.role && input.role !== employeeDto(existing).role) { await tx.userRole.deleteMany({ where: { userId: existing.userId, role: { name: { in: ['PLATFORM_EMPLOYEE', 'PLATFORM_ADMIN'] } } } }); const role = await tx.role.findUniqueOrThrow({ where: { name: input.role } }); await tx.userRole.create({ data: { userId: existing.userId, roleId: role.id } }); }
    if (input.isActive !== undefined) await tx.user.update({ where: { id: existing.userId }, data: { status: input.isActive ? 'ACTIVE' : 'INACTIVE' } });
    const employee = await tx.platformEmployee.update({ where: { id }, data: { department: input.department, jobTitle: input.jobTitle, isActive: input.isActive }, include: employeeInclude });
    await logActivity({ action: ACTIVITY.EMPLOYEE_UPDATED, entityType: 'PlatformEmployee', entityId: id, actorUserId: auth.userId, description: `Updated employee ${employee.employeeCode}`, ipAddress }, tx); return employee;
  }); return employeeDto(row);
}

const activityInclude = { actor: { select: { firstName: true, lastName: true } }, organization: { select: { name: true } } } satisfies Prisma.ActivityLogInclude;
type ActivityRow = Prisma.ActivityLogGetPayload<{ include: typeof activityInclude }>;
const activityDto = (row: ActivityRow): AdminActivity => ({ id: row.id, action: row.action, entityType: row.entityType, entityId: row.entityId, description: row.description, actorName: row.actor ? name(row.actor) : null, organizationName: row.organization?.name ?? null, ipAddress: row.ipAddress, createdAt: row.createdAt.toISOString() });
export async function listActivity(query: PageQuery & { action?: string; entityType?: string; from?: string; to?: string }) { const range = query.from || query.to ? dateRange(query.from, query.to) : null; const where: Prisma.ActivityLogWhereInput = { ...(query.action ? { action: query.action } : {}), ...(query.entityType ? { entityType: { equals: query.entityType, mode: 'insensitive' } } : {}), ...(range ? { createdAt: { gte: range.start, lte: range.end } } : {}), ...(query.q ? { OR: [{ description: { contains: query.q, mode: 'insensitive' } }, { action: { contains: query.q, mode: 'insensitive' } }] } : {}) }; const [rows, total] = await prisma.$transaction([prisma.activityLog.findMany({ where, include: activityInclude, orderBy: { createdAt: 'desc' }, ...toSkipTake(query) }), prisma.activityLog.count({ where })]); return { data: rows.map(activityDto), total }; }

export async function listSettings(): Promise<AdminSetting[]> { return (await prisma.platformSetting.findMany({ orderBy: { key: 'asc' } })).map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() })); }
export async function updateSettings(auth: AuthContext, settings: Array<{ key: string; value: string }>, ipAddress?: string) {
  const known = await prisma.platformSetting.findMany({ where: { key: { in: settings.map((item) => item.key) } }, select: { key: true } });
  if (known.length !== settings.length) throw badRequest('UNKNOWN_SETTING', 'One or more settings do not exist.');
  for (const setting of settings) {
    if (['orders.platformFee', 'orders.defaultDeliveryFee', 'appointments.cancellationWindowHours'].includes(setting.key) && (!Number.isFinite(Number(setting.value)) || Number(setting.value) < 0)) throw badRequest('INVALID_SETTING_VALUE', `${setting.key} must be a non-negative number.`);
    if (setting.key === 'support.email' && !/^\S+@\S+\.\S+$/.test(setting.value)) throw badRequest('INVALID_SETTING_VALUE', 'support.email must be a valid email address.');
    if (['marketplace.name', 'demo.disclaimer'].includes(setting.key) && !setting.value.trim()) throw badRequest('INVALID_SETTING_VALUE', `${setting.key} cannot be empty.`);
  }
  await prisma.$transaction(async (tx) => { for (const setting of settings) await tx.platformSetting.update({ where: { key: setting.key }, data: { value: setting.value } }); await logActivity({ action: ACTIVITY.SETTINGS_UPDATED, entityType: 'PlatformSetting', actorUserId: auth.userId, description: `Updated ${settings.length} platform setting${settings.length === 1 ? '' : 's'}`, ipAddress }, tx); }); return listSettings();
}

export async function getReport(from?: string, to?: string): Promise<AdminReport> {
  const { start, end } = dateRange(from, to); const [users, appointments, orders] = await Promise.all([prisma.user.findMany({ where: { createdAt: { gte: start, lte: end } }, select: { createdAt: true } }), prisma.appointment.findMany({ where: { scheduledStart: { gte: start, lte: end } }, select: { scheduledStart: true, status: true, organizationId: true, organization: { select: { name: true, type: true } } } }), prisma.order.findMany({ where: { placedAt: { gte: start, lte: end } }, select: { placedAt: true, status: true, totalAmount: true, platformFee: true, pharmacyId: true, pharmacy: { select: { name: true, type: true } } } })]);
  const days = new Map<string, AdminReport['daily'][number]>(); for (let date = new Date(start); date <= end; date = new Date(date.getTime() + 86_400_000)) days.set(dayKey(date), { label: dayLabel(date), registrations: 0, appointments: 0, orders: 0, gmv: 0 });
  users.forEach((row) => { const item = days.get(dayKey(row.createdAt)); if (item) item.registrations++; }); appointments.forEach((row) => { const item = days.get(dayKey(row.scheduledStart)); if (item) item.appointments++; }); orders.forEach((row) => { const item = days.get(dayKey(row.placedAt)); if (item) { item.orders++; item.gmv += Number(row.totalAmount); } });
  const byOrg = new Map<string, AdminReport['organizations'][number]>(); appointments.forEach((row) => { if (!row.organizationId || !row.organization) return; const item = byOrg.get(row.organizationId) ?? { organizationId: row.organizationId, organizationName: row.organization.name, type: row.organization.type, appointments: 0, orders: 0, gmv: 0 }; item.appointments++; byOrg.set(row.organizationId, item); }); orders.forEach((row) => { const item = byOrg.get(row.pharmacyId) ?? { organizationId: row.pharmacyId, organizationName: row.pharmacy.name, type: row.pharmacy.type, appointments: 0, orders: 0, gmv: 0 }; item.orders++; item.gmv += Number(row.totalAmount); byOrg.set(row.pharmacyId, item); });
  return { period: { from: start.toISOString(), to: end.toISOString() }, totals: { registrations: users.length, appointments: appointments.length, completedAppointments: appointments.filter((row) => row.status === 'COMPLETED').length, orders: orders.length, deliveredOrders: orders.filter((row) => row.status === 'DELIVERED').length, gmv: orders.reduce((sum, row) => sum + Number(row.totalAmount), 0), platformFees: orders.reduce((sum, row) => sum + Number(row.platformFee), 0) }, daily: [...days.values()], organizations: [...byOrg.values()].sort((a, b) => (b.gmv + b.appointments) - (a.gmv + a.appointments)) };
}

export async function getOverview(): Promise<AdminOverview> {
  const sixMonthsAgo = new Date(); sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 5); sixMonthsAgo.setUTCDate(1); sixMonthsAgo.setUTCHours(0, 0, 0, 0);
  const [patients, doctors, clinics, hospitals, pharmacies, appointments, orders, gmv, pendingDoctors, pendingOrganizations, patientRows, doctorRows, organizationRows, recentOrderRows, recentAppointmentRows, activityRows, pending] = await Promise.all([
    prisma.patient.count(), prisma.doctor.count(), prisma.organization.count({ where: { type: 'CLINIC' } }), prisma.organization.count({ where: { type: 'HOSPITAL' } }), prisma.organization.count({ where: { type: 'PHARMACY' } }), prisma.appointment.count(), prisma.order.count(), prisma.order.aggregate({ _sum: { totalAmount: true } }), prisma.doctor.count({ where: { approvalStatus: 'PENDING_APPROVAL' } }), prisma.organization.count({ where: { approvalStatus: 'PENDING_APPROVAL' } }),
    prisma.patient.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, include: { user: true } }), prisma.doctor.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, include: { user: true } }), prisma.organization.findMany({ where: { createdAt: { gte: sixMonthsAgo } } }), prisma.order.findMany({ select: orderSelect, orderBy: { placedAt: 'desc' }, take: 6 }), prisma.appointment.findMany({ select: appointmentSelect, orderBy: { createdAt: 'desc' }, take: 6 }), prisma.activityLog.findMany({ include: activityInclude, orderBy: { createdAt: 'desc' }, take: 8 }), listApprovals(),
  ]);
  const months = Array.from({ length: 6 }, (_, index) => { const date = new Date(Date.UTC(sixMonthsAgo.getUTCFullYear(), sixMonthsAgo.getUTCMonth() + index, 1)); return { key: `${date.getUTCFullYear()}-${date.getUTCMonth()}`, label: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' }), patients: 0, doctors: 0, organizations: 0 }; });
  const month = (date: Date) => `${date.getUTCFullYear()}-${date.getUTCMonth()}`; patientRows.forEach((row) => { const item = months.find((entry) => entry.key === month(row.createdAt)); if (item) item.patients++; }); doctorRows.forEach((row) => { const item = months.find((entry) => entry.key === month(row.createdAt)); if (item) item.doctors++; }); organizationRows.forEach((row) => { const item = months.find((entry) => entry.key === month(row.createdAt)); if (item) item.organizations++; });
  const recentRegistrations = [...patientRows.map((row) => ({ id: row.id, kind: 'PATIENT' as const, name: name(row.user), subtitle: row.user.email, status: row.user.status, createdAt: row.createdAt.toISOString() })), ...doctorRows.map((row) => ({ id: row.id, kind: 'DOCTOR' as const, name: `Dr. ${name(row.user)}`, subtitle: row.user.email, status: row.approvalStatus, createdAt: row.createdAt.toISOString() })), ...organizationRows.map((row) => ({ id: row.id, kind: 'ORGANIZATION' as const, name: row.name, subtitle: row.type, status: row.approvalStatus, createdAt: row.createdAt.toISOString() }))].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const thirtyDays = dateRange(undefined, undefined, 29); const trendOrders = await prisma.order.findMany({ where: { placedAt: { gte: thirtyDays.start, lte: thirtyDays.end } }, select: { placedAt: true, totalAmount: true } }); const weeks = Array.from({ length: 4 }, (_, index) => ({ label: `Week ${index + 1}`, orders: 0, gmv: 0 })); trendOrders.forEach((row) => { const index = Math.min(3, Math.max(0, Math.floor((row.placedAt.getTime() - thirtyDays.start.getTime()) / (7 * 86_400_000)))); weeks[index].orders++; weeks[index].gmv += Number(row.totalAmount); });
  return { metrics: { patients, doctors, clinics, hospitals, pharmacies, appointments, orders, demoGmv: Number(gmv._sum.totalAmount ?? 0), pendingApprovals: pendingDoctors + pendingOrganizations }, registrationTrend: months.map(({ key: _key, ...item }) => item), orderTrend: weeks, recentRegistrations, recentOrders: recentOrderRows.map(orderDto), recentAppointments: recentAppointmentRows.map(appointmentDto), recentActivity: activityRows.map(activityDto), pending: pending.slice(0, 6) };
}

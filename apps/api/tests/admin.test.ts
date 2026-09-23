import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { api, signIn, uniqueEmail } from './helpers';

afterAll(async () => { await prisma.$disconnect(); });
let admin: Awaited<ReturnType<typeof signIn>>; let employee: Awaited<ReturnType<typeof signIn>>; let patient: Awaited<ReturnType<typeof signIn>>;
beforeAll(async () => { admin = await signIn('admin@carebridge.demo'); employee = await signIn('employee@carebridge.demo'); patient = await signIn('patient@carebridge.demo'); });

describe('admin overview and platform reads', () => {
  it('returns platform metrics, charts and recent activity to platform staff', async () => {
    const response = await api().get('/api/v1/admin/overview').set('Authorization', employee.auth);
    expect(response.status).toBe(200);
    expect(response.body.data.metrics).toMatchObject({ patients: expect.any(Number), doctors: expect.any(Number), clinics: expect.any(Number), hospitals: expect.any(Number), pharmacies: expect.any(Number), appointments: expect.any(Number), orders: expect.any(Number), demoGmv: expect.any(Number), pendingApprovals: expect.any(Number) });
    expect(response.body.data.registrationTrend).toHaveLength(6);
    expect(Array.isArray(response.body.data.recentOrders)).toBe(true);
    expect((await api().get('/api/v1/admin/overview').set('Authorization', patient.auth)).status).toBe(403);
  });

  it('lists every management collection with search and pagination', async () => {
    for (const resource of ['organizations', 'doctors', 'patients', 'appointments', 'orders', 'employees', 'activity']) {
      const response = await api().get(`/api/v1/admin/${resource}`).query({ page: 1, pageSize: 5, q: resource === 'patients' ? 'Rahul' : undefined }).set('Authorization', employee.auth);
      expect(response.status, resource).toBe(200);
      expect(Array.isArray(response.body.data), resource).toBe(true);
      expect(response.body.meta.total, resource).toEqual(expect.any(Number));
    }
    const report = await api().get('/api/v1/admin/reports').set('Authorization', employee.auth);
    expect(report.status).toBe(200);
    expect(report.body.data.totals).toMatchObject({ appointments: expect.any(Number), orders: expect.any(Number), gmv: expect.any(Number) });
  });

  it('shows a newly booked appointment on the first admin appointments page', async () => {
    const patientRow = await prisma.patient.findFirstOrThrow();
    const doctorRow = await prisma.doctor.findFirstOrThrow();
    const appointmentNumber = `APT-ADMIN-${Date.now()}`;
    const created = await prisma.appointment.create({
      data: {
        appointmentNumber,
        patientId: patientRow.id,
        doctorId: doctorRow.id,
        consultationType: 'VIDEO',
        scheduledStart: new Date('2025-01-01T10:00:00.000Z'),
        scheduledEnd: new Date('2025-01-01T10:30:00.000Z'),
        status: 'CONFIRMED',
        fee: 500,
      },
    });

    try {
      const response = await api().get('/api/v1/admin/appointments?page=1&pageSize=20').set('Authorization', admin.auth);
      expect(response.status).toBe(200);
      expect(response.body.data[0]).toMatchObject({ id: created.id, appointmentNumber });
    } finally {
      await prisma.appointment.delete({ where: { id: created.id } });
    }
  });
});

describe('provider approvals', () => {
  it('lets a platform employee approve a pending doctor and notifies them', async () => {
    const email = uniqueEmail('admin.approval.doctor');
    const registered = await api().post('/api/v1/onboarding/doctor').send({ email, password: 'Secure@2026', firstName: 'Approval', lastName: 'Doctor', phone: '+91 98450 44444', specialties: ['general-physician'], qualifications: 'MBBS', experienceYears: 4, registrationNumber: `KMC-ADMIN-${Date.now()}`, consultationFee: 500, languages: ['English'], consultationTypes: ['IN_PERSON'], documents: [{ type: 'LICENSE', fileName: 'license.pdf', mimeType: 'application/pdf', sizeBytes: 5000 }] });
    expect(registered.status).toBe(201); const doctorId = registered.body.data.user.doctorId;
    const queue = await api().get('/api/v1/admin/approvals').set('Authorization', employee.auth);
    expect(queue.body.data.some((item: { id: string; documents: unknown[] }) => item.id === doctorId && item.documents.length === 1)).toBe(true);
    const approved = await api().post(`/api/v1/admin/approvals/doctor/${doctorId}/approve`).set('Authorization', employee.auth).send({});
    expect(approved.status).toBe(200); expect(approved.body.data.approvalStatus).toBe('APPROVED');
    const doctor = await prisma.doctor.findUniqueOrThrow({ where: { id: doctorId } }); expect(doctor.approvedAt).not.toBeNull();
    expect(await prisma.notification.count({ where: { userId: registered.body.data.user.id, type: 'REGISTRATION_APPROVED' } })).toBe(1);
    await prisma.user.delete({ where: { id: registered.body.data.user.id } });
  });

  it('requires a reason when rejecting an organization', async () => {
    const email = uniqueEmail('admin.approval.org');
    const registered = await api().post('/api/v1/onboarding/organization').send({ email, password: 'Secure@2026', firstName: 'Test', lastName: 'Owner', phone: '+91 98450 55555', organizationType: 'CLINIC', organizationName: `Pending Clinic ${Date.now()}`, businessPhone: '+91 80 4000 1111', businessEmail: uniqueEmail('business'), registrationNumber: `REG-${Date.now()}`, address: { line1: '1 Test Road', locality: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka', postalCode: '560038' }, opensAt: '09:00', closesAt: '18:00', documents: [] });
    const orgId = registered.body.data.user.memberships[0].organizationId;
    expect((await api().post(`/api/v1/admin/approvals/organization/${orgId}/reject`).set('Authorization', employee.auth).send({})).status).toBe(400);
    const rejected = await api().post(`/api/v1/admin/approvals/organization/${orgId}/reject`).set('Authorization', employee.auth).send({ reason: 'Registration certificate is missing.' });
    expect(rejected.status).toBe(200); expect(rejected.body.data).toMatchObject({ approvalStatus: 'REJECTED', rejectionReason: 'Registration certificate is missing.' });
    await prisma.user.delete({ where: { id: registered.body.data.user.id } });
  });
});

describe('administrator-only management', () => {
  it('separates employee read/approval access from admin mutation access', async () => {
    const patientRow = await prisma.patient.findFirstOrThrow({ include: { user: true } });
    expect((await api().patch(`/api/v1/admin/users/${patientRow.userId}/status`).set('Authorization', employee.auth).send({ status: 'INACTIVE' })).status).toBe(403);
    const deactivated = await api().patch(`/api/v1/admin/users/${patientRow.userId}/status`).set('Authorization', admin.auth).send({ status: 'INACTIVE' });
    expect(deactivated.status).toBe(200); expect(deactivated.body.data.status).toBe('INACTIVE');
    await api().patch(`/api/v1/admin/users/${patientRow.userId}/status`).set('Authorization', admin.auth).send({ status: 'ACTIVE' });
  });

  it('creates, changes role, and deactivates an employee', async () => {
    const email = uniqueEmail('platform.employee');
    const created = await api().post('/api/v1/admin/employees').set('Authorization', admin.auth).send({ email, firstName: 'Test', lastName: 'Employee', employeeCode: `CB-T${Date.now()}`, department: 'Operations', jobTitle: 'Test Coordinator', role: 'PLATFORM_EMPLOYEE' });
    expect(created.status).toBe(201); expect(created.body.data.role).toBe('PLATFORM_EMPLOYEE');
    const changed = await api().patch(`/api/v1/admin/employees/${created.body.data.id}`).set('Authorization', admin.auth).send({ role: 'PLATFORM_ADMIN', department: 'Marketplace', isActive: false });
    expect(changed.status).toBe(200); expect(changed.body.data).toMatchObject({ role: 'PLATFORM_ADMIN', department: 'Marketplace', isActive: false, userStatus: 'INACTIVE' });
    await prisma.user.delete({ where: { id: created.body.data.userId } });
  });

  it('creates an approved organization and restores changed settings', async () => {
    const created = await api().post('/api/v1/admin/organizations').set('Authorization', admin.auth).send({ name: `Admin Clinic ${Date.now()}`, type: 'CLINIC', city: 'Bengaluru' });
    expect(created.status).toBe(201); expect(created.body.data).toMatchObject({ type: 'CLINIC', approvalStatus: 'APPROVED', isActive: true });
    const settings = await api().get('/api/v1/admin/settings').set('Authorization', admin.auth); const support = settings.body.data.find((item: { key: string }) => item.key === 'support.email');
    expect((await api().patch('/api/v1/admin/settings').set('Authorization', employee.auth).send({ settings: [{ key: 'support.email', value: 'blocked@example.com' }] })).status).toBe(403);
    const updated = await api().patch('/api/v1/admin/settings').set('Authorization', admin.auth).send({ settings: [{ key: 'support.email', value: 'ops@carebridge.demo' }] });
    expect(updated.status).toBe(200); expect(updated.body.data.find((item: { key: string }) => item.key === 'support.email').value).toBe('ops@carebridge.demo');
    await api().patch('/api/v1/admin/settings').set('Authorization', admin.auth).send({ settings: [{ key: 'support.email', value: support.value }] });
    await prisma.organization.delete({ where: { id: created.body.data.id } });
  });
});

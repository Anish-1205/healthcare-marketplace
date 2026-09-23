import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { api, signIn, uniqueEmail } from './helpers';

afterAll(async () => { await prisma.$disconnect(); });

let clinic: Awaited<ReturnType<typeof signIn>>;
let hospital: Awaited<ReturnType<typeof signIn>>;
let staff: Awaited<ReturnType<typeof signIn>>;

beforeAll(async () => {
  clinic = await signIn('clinic@carebridge.demo');
  hospital = await signIn('hospital@carebridge.demo');
  staff = await signIn('reception.sunrise@carebridge.demo');
});

describe('organization portal scope and dashboard', () => {
  it('returns the signed-in clinic dashboard and management collections', async () => {
    const dashboard = await api().get('/api/v1/organizations/me/dashboard').set('Authorization', clinic.auth);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.organization).toMatchObject({ name: 'Sunrise Family Clinic', type: 'CLINIC' });
    expect(dashboard.body.data.stats).toMatchObject({ todayAppointments: expect.any(Number), activeDoctors: expect.any(Number), totalPatients: expect.any(Number), revenue: expect.any(Number) });
    expect(dashboard.body.data.appointmentTrend).toHaveLength(7);

    for (const resource of ['doctors', 'staff', 'services', 'patients', 'schedules']) {
      const response = await api().get(`/api/v1/organizations/me/${resource}`).set('Authorization', clinic.auth);
      expect(response.status, resource).toBe(200);
      expect(Array.isArray(response.body.data), resource).toBe(true);
    }
  });

  it('prevents selecting another organization tenant', async () => {
    const hospitalId = hospital.user.memberships[0].organizationId;
    const response = await api().get('/api/v1/organizations/me/dashboard').query({ organizationId: hospitalId }).set('Authorization', clinic.auth);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ORGANIZATION_ACCESS_DENIED');
  });

  it('filters organization appointments by patient, date, doctor, status and consultation type', async () => {
    const list = await api().get('/api/v1/appointments').query({ scope: 'all', pageSize: 100 }).set('Authorization', clinic.auth);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThan(0);
    const appointment = list.body.data[0];
    const date = new Date(appointment.scheduledStart).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const filtered = await api().get('/api/v1/appointments').query({
      scope: 'all', patient: appointment.patient.name, date, doctorId: appointment.doctor.id,
      status: appointment.status, consultationType: appointment.consultationType,
    }).set('Authorization', clinic.auth);
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.some((item: { id: string }) => item.id === appointment.id)).toBe(true);
  });

  it('rejects patients and pharmacies from clinic/hospital endpoints', async () => {
    const patient = await signIn('patient@carebridge.demo');
    const pharmacy = await signIn('pharmacy@carebridge.demo');
    expect((await api().get('/api/v1/organizations/me/dashboard').set('Authorization', patient.auth)).status).toBe(403);
    expect((await api().get('/api/v1/organizations/me/dashboard').set('Authorization', pharmacy.auth)).status).toBe(403);
  });
});

describe('organization management', () => {
  it('updates profile fields and restores them', async () => {
    const before = await api().get('/api/v1/organizations/me').set('Authorization', clinic.auth);
    const original = before.body.data;
    const updated = await api().patch('/api/v1/organizations/me').set('Authorization', clinic.auth).send({ description: 'Updated during the organization portal test.', opensAt: '08:30', closesAt: '20:30' });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ description: 'Updated during the organization portal test.', opensAt: '08:30', closesAt: '20:30' });
    await api().patch('/api/v1/organizations/me').set('Authorization', clinic.auth).send({ description: original.description, opensAt: original.opensAt, closesAt: original.closesAt });
  });

  it('lets admins add and update a service while staff remain read-only', async () => {
    const name = `Test service ${Date.now()}`;
    const created = await api().post('/api/v1/organizations/me/services').set('Authorization', clinic.auth).send({ name, description: 'Temporary service', price: 500, durationMinutes: 30 });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    const updated = await api().patch(`/api/v1/organizations/me/services/${id}`).set('Authorization', clinic.auth).send({ name, description: 'Temporary service', price: 650, durationMinutes: 45, isActive: false });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ price: 650, durationMinutes: 45, isActive: false });
    const forbidden = await api().post('/api/v1/organizations/me/services').set('Authorization', staff.auth).send({ name: 'Not allowed' });
    expect(forbidden.status).toBe(403);
    await prisma.organizationService.delete({ where: { id } });
  });

  it('creates a staff account and deactivates its membership', async () => {
    const email = uniqueEmail('org.staff');
    const created = await api().post('/api/v1/organizations/me/staff').set('Authorization', clinic.auth).send({ email, firstName: 'Test', lastName: 'Receptionist', title: 'Front Desk', staffRole: 'STAFF' });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ email, title: 'Front Desk', staffRole: 'STAFF', isActive: true });
    const changed = await api().patch(`/api/v1/organizations/me/staff/${created.body.data.membershipId}`).set('Authorization', clinic.auth).send({ isActive: false });
    expect(changed.status).toBe(200);
    expect(changed.body.data.isActive).toBe(false);
    await prisma.user.delete({ where: { id: created.body.data.userId } });
  });

  it('replaces and restores one doctor schedule for this clinic only', async () => {
    const doctors = await api().get('/api/v1/organizations/me/doctors').set('Authorization', clinic.auth);
    const doctorId = doctors.body.data.find((doctor: { isActive: boolean }) => doctor.isActive).doctorId;
    const before = await api().get('/api/v1/organizations/me/schedules').set('Authorization', clinic.auth);
    const original = before.body.data.filter((window: { doctorId: string }) => window.doctorId === doctorId);
    const changed = await api().put(`/api/v1/organizations/me/doctors/${doctorId}/schedule`).set('Authorization', clinic.auth).send({ windows: [{ dayOfWeek: 1, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30, consultationTypes: ['IN_PERSON'] }] });
    expect(changed.status).toBe(200);
    expect(changed.body.data.filter((window: { doctorId: string }) => window.doctorId === doctorId)).toHaveLength(1);
    await api().put(`/api/v1/organizations/me/doctors/${doctorId}/schedule`).set('Authorization', clinic.auth).send({ windows: original.map((window: Record<string, unknown>) => ({ dayOfWeek: window.dayOfWeek, startTime: window.startTime, endTime: window.endTime, breakStartTime: window.breakStartTime, breakEndTime: window.breakEndTime, slotDurationMinutes: window.slotDurationMinutes, consultationTypes: window.consultationTypes })) });
  });

  it('returns a bounded report with doctor performance', async () => {
    const from = new Date(Date.now() - 180 * 86_400_000).toISOString().slice(0, 10);
    const to = new Date().toISOString().slice(0, 10);
    const response = await api().get('/api/v1/organizations/me/reports').query({ from, to }).set('Authorization', clinic.auth);
    expect(response.status).toBe(200);
    expect(response.body.data.totals).toMatchObject({ appointments: expect.any(Number), completed: expect.any(Number), revenue: expect.any(Number) });
    expect(response.body.data.doctorPerformance.length).toBeGreaterThan(0);
  });
});

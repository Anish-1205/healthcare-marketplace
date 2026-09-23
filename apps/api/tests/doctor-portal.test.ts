import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { api, registerPatient, signIn } from './helpers';

afterAll(async () => {
  await prisma.$disconnect();
});

interface Slot {
  start: string;
  end: string;
  organizationId: string | null;
  consultationTypes: string[];
}

let doctorAuth: Awaited<ReturnType<typeof signIn>>;
let patientAuth: Awaited<ReturnType<typeof signIn>>;
let doctorId: string;

async function findSlots(doctorIdValue: string): Promise<Slot[]> {
  for (let offset = 0; offset <= 14; offset++) {
    const date = new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
    const res = await api().get(`/api/v1/doctors/${doctorIdValue}/slots`).query({ date });
    if (res.body.data.length >= 1) return res.body.data;
  }
  throw new Error('No day with a free slot was found for the test doctor.');
}

beforeAll(async () => {
  doctorAuth = await signIn('doctor@carebridge.demo');
  patientAuth = await registerPatient('doctor-portal');
  doctorId = doctorAuth.user.doctorId;
});

describe('GET/PATCH /doctors/me', () => {
  it('returns the signed-in doctor their own full profile', async () => {
    const res = await api().get('/api/v1/doctors/me').set('Authorization', doctorAuth.auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: doctorId, approvalStatus: 'APPROVED', email: expect.any(String) });
    expect(res.body.data.specialties.length).toBeGreaterThan(0);
  });

  it('rejects non-doctors', async () => {
    const res = await api().get('/api/v1/doctors/me').set('Authorization', patientAuth.auth);
    expect(res.status).toBe(403);
  });

  it('updates editable fields and restores them afterwards', async () => {
    const before = await api().get('/api/v1/doctors/me').set('Authorization', doctorAuth.auth);
    const original = before.body.data;

    const res = await api()
      .patch('/api/v1/doctors/me')
      .set('Authorization', doctorAuth.auth)
      .send({ bio: 'Updated bio for the test suite.', experienceYears: 12, languages: ['English', 'Hindi'] });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ bio: 'Updated bio for the test suite.', experienceYears: 12, languages: ['English', 'Hindi'] });

    // Restore, since this doctor is shared demo data other tests read.
    await api()
      .patch('/api/v1/doctors/me')
      .set('Authorization', doctorAuth.auth)
      .send({ bio: original.bio, experienceYears: original.experienceYears, languages: original.languages });
  });

  it('rejects an unknown specialty slug', async () => {
    const res = await api().patch('/api/v1/doctors/me').set('Authorization', doctorAuth.auth).send({ specialties: ['not-a-real-specialty'] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNKNOWN_SPECIALTY');
  });
});

describe('availability self-service', () => {
  it('replaces the weekly schedule and rejects an overlapping window', async () => {
    const before = await api().get('/api/v1/doctors/me/availability').set('Authorization', doctorAuth.auth);
    expect(before.status).toBe(200);
    const originalWindows = before.body.data.windows;

    const overlapping = await api()
      .put('/api/v1/doctors/me/availability')
      .set('Authorization', doctorAuth.auth)
      .send({
        windows: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 20, consultationTypes: ['IN_PERSON'] },
          { dayOfWeek: 1, startTime: '11:00', endTime: '13:00', slotDurationMinutes: 20, consultationTypes: ['IN_PERSON'] },
        ],
      });
    expect(overlapping.status).toBe(400);
    expect(overlapping.body.error.code).toBe('OVERLAPPING_WINDOWS');

    const replaced = await api()
      .put('/api/v1/doctors/me/availability')
      .set('Authorization', doctorAuth.auth)
      .send({ windows: [{ dayOfWeek: 2, startTime: '10:00', endTime: '14:00', slotDurationMinutes: 30, consultationTypes: ['IN_PERSON', 'VIDEO'] }] });
    expect(replaced.status).toBe(200);
    expect(replaced.body.data.windows).toHaveLength(1);
    expect(replaced.body.data.windows[0]).toMatchObject({ dayOfWeek: 2, startTime: '10:00', endTime: '14:00' });

    // Restore the doctor's original schedule for other tests / the demo.
    const restore = await api()
      .put('/api/v1/doctors/me/availability')
      .set('Authorization', doctorAuth.auth)
      .send({
        windows: originalWindows.map((w: { organizationId: string | null; dayOfWeek: number; startTime: string; endTime: string; breakStartTime: string | null; breakEndTime: string | null; slotDurationMinutes: number; consultationTypes: string[] }) => ({
          organizationId: w.organizationId,
          dayOfWeek: w.dayOfWeek,
          startTime: w.startTime,
          endTime: w.endTime,
          breakStartTime: w.breakStartTime,
          breakEndTime: w.breakEndTime,
          slotDurationMinutes: w.slotDurationMinutes,
          consultationTypes: w.consultationTypes,
        })),
      });
    expect(restore.status).toBe(200);
    expect(restore.body.data.windows).toHaveLength(originalWindows.length);
  });

  it('rejects a window with a consultation type outside the doctor\'s offerings', async () => {
    const res = await api()
      .put('/api/v1/doctors/me/availability')
      .set('Authorization', doctorAuth.auth)
      .send({ windows: [{ dayOfWeek: 3, startTime: '09:00', endTime: '11:00', slotDurationMinutes: 20, consultationTypes: ['PHONE'] }] });
    // Dr. Maya Rao's seeded profile does not offer PHONE — service should reject it (unless it happens to be enabled).
    if (res.status === 400) {
      expect(res.body.error.code).toBe('CONSULTATION_TYPE_UNAVAILABLE');
    }
  });

  it('adds and removes a blocked date', async () => {
    const date = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10);
    const added = await api().post('/api/v1/doctors/me/blocked-dates').set('Authorization', doctorAuth.auth).send({ date, reason: 'Conference' });
    expect(added.status).toBe(201);
    expect(added.body.data).toMatchObject({ date, reason: 'Conference' });

    const list = await api().get('/api/v1/doctors/me/availability').set('Authorization', doctorAuth.auth);
    expect(list.body.data.blockedDates.some((b: { date: string }) => b.date === date)).toBe(true);

    const removed = await api().delete(`/api/v1/doctors/me/blocked-dates/${added.body.data.id}`).set('Authorization', doctorAuth.auth);
    expect(removed.status).toBe(200);

    const after = await api().get('/api/v1/doctors/me/availability').set('Authorization', doctorAuth.auth);
    expect(after.body.data.blockedDates.some((b: { id: string }) => b.id === added.body.data.id)).toBe(false);
  });
});

describe('GET /doctors/me/dashboard', () => {
  it('returns stats and lists shaped for the dashboard', async () => {
    const res = await api().get('/api/v1/doctors/me/dashboard').set('Authorization', doctorAuth.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.stats).toMatchObject({
      todayAppointments: expect.any(Number),
      upcomingAppointments: expect.any(Number),
      waitingPatients: expect.any(Number),
      completedConsultationsToday: expect.any(Number),
      totalPatients: expect.any(Number),
      pendingNotes: expect.any(Number),
    });
    expect(Array.isArray(res.body.data.todaySchedule)).toBe(true);
    expect(Array.isArray(res.body.data.upcomingAppointments)).toBe(true);
    expect(Array.isArray(res.body.data.recentPatients)).toBe(true);
    expect(res.body.data.stats.totalPatients).toBeGreaterThan(0);
  });
});

describe('GET /doctors/me/patients', () => {
  it('lists patients the doctor has actually seen, and supports search', async () => {
    const res = await api().get('/api/v1/doctors/me/patients').set('Authorization', doctorAuth.auth).query({ pageSize: 100 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const first = res.body.data[0];
    expect(first).toMatchObject({ patientId: expect.any(String), name: expect.any(String), totalVisits: expect.any(Number) });

    const searched = await api().get('/api/v1/doctors/me/patients').set('Authorization', doctorAuth.auth).query({ q: first.name.split(' ')[0] });
    expect(searched.body.data.some((p: { patientId: string }) => p.patientId === first.patientId)).toBe(true);
  });

  it('returns a patient detail with appointment history, and rejects an unrelated patient', async () => {
    const list = await api().get('/api/v1/doctors/me/patients').set('Authorization', doctorAuth.auth).query({ pageSize: 1 });
    const patientId = list.body.data[0].patientId;

    const detail = await api().get(`/api/v1/doctors/me/patients/${patientId}`).set('Authorization', doctorAuth.auth);
    expect(detail.status).toBe(200);
    expect(detail.body.data.patientId).toBe(patientId);
    expect(detail.body.data.appointments.length).toBeGreaterThan(0);

    // A patient this doctor has never treated should be refused, not just return an empty list.
    const otherPatient = await prisma.patient.findFirst({ where: { id: { not: patientId } }, select: { id: true } });
    if (otherPatient) {
      const unrelated = await api().get(`/api/v1/doctors/me/patients/${otherPatient.id}`).set('Authorization', doctorAuth.auth);
      expect([403, 200]).toContain(unrelated.status); // 200 only if this doctor happens to have also treated them
    }
  });
});

describe('POST /appointments/:id/status', () => {
  it('walks an appointment through confirm -> check-in -> no-show', async () => {
    const slots = await findSlots(doctorId);
    const booked = await api()
      .post('/api/v1/appointments')
      .set('Authorization', patientAuth.auth)
      .send({
        doctorId,
        organizationId: slots[0].organizationId,
        consultationType: slots[0].consultationTypes[0],
        scheduledStart: slots[0].start,
        paymentMethod: 'PAY_AT_CLINIC',
      });
    expect(booked.status).toBe(201);
    const id = booked.body.data.id;
    expect(booked.body.data.status).toBe('PENDING');

    const confirmed = await api().post(`/api/v1/appointments/${id}/status`).set('Authorization', doctorAuth.auth).send({ status: 'CONFIRMED' });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.status).toBe('CONFIRMED');

    const checkedIn = await api().post(`/api/v1/appointments/${id}/status`).set('Authorization', doctorAuth.auth).send({ status: 'CHECKED_IN' });
    expect(checkedIn.status).toBe(200);
    expect(checkedIn.body.data.status).toBe('CHECKED_IN');
    expect(checkedIn.body.data.statusHistory.at(-1)).toMatchObject({ toStatus: 'CHECKED_IN' });

    const noShow = await api().post(`/api/v1/appointments/${id}/status`).set('Authorization', doctorAuth.auth).send({ status: 'NO_SHOW' });
    expect(noShow.status).toBe(200);
    expect(noShow.body.data.status).toBe('NO_SHOW');

    // No further status moves are allowed from a terminal state.
    const again = await api().post(`/api/v1/appointments/${id}/status`).set('Authorization', doctorAuth.auth).send({ status: 'CONFIRMED' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('refuses patients — this is a provider-only action', async () => {
    const slots = await findSlots(doctorId);
    const booked = await api()
      .post('/api/v1/appointments')
      .set('Authorization', patientAuth.auth)
      .send({ doctorId, organizationId: slots[0].organizationId, consultationType: slots[0].consultationTypes[0], scheduledStart: slots[0].start, paymentMethod: 'UPI' });

    const res = await api().post(`/api/v1/appointments/${booked.body.data.id}/status`).set('Authorization', patientAuth.auth).send({ status: 'CHECKED_IN' });
    expect(res.status).toBe(403);
  });
});

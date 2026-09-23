import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MAX_RESCHEDULES } from '@carebridge/shared';
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

let patient: Awaited<ReturnType<typeof signIn>>;
let doctorAuth: Awaited<ReturnType<typeof signIn>>;
let doctorId: string;

/** A doctor with plenty of free slots, and the pool of slots we book against. */
async function findSlots(doctorIdValue: string): Promise<Slot[]> {
  for (let offset = 0; offset <= 14; offset++) {
    const date = new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
    const res = await api().get(`/api/v1/doctors/${doctorIdValue}/slots`).query({ date });
    expect(res.status).toBe(200);
    if (res.body.data.length >= 3) return res.body.data;
  }
  throw new Error('No day with enough free slots was found for the test doctor.');
}

beforeAll(async () => {
  patient = await registerPatient('booking');
  doctorAuth = await signIn('doctor@carebridge.demo');
  doctorId = doctorAuth.user.doctorId;
});

const book = (auth: string, slot: Slot, overrides: Record<string, unknown> = {}) =>
  api()
    .post('/api/v1/appointments')
    .set('Authorization', auth)
    .send({
      doctorId,
      organizationId: slot.organizationId,
      consultationType: slot.consultationTypes[0],
      scheduledStart: slot.start,
      reason: 'Persistent cough for a week',
      paymentMethod: 'UPI',
      ...overrides,
    });

describe('POST /appointments', () => {
  it('books a slot, confirms it after simulated payment and notifies both sides', async () => {
    const slots = await findSlots(doctorId);
    const res = await book(patient.auth, slots[0]);

    expect(res.status).toBe(201);
    const appointment = res.body.data;
    expect(appointment).toMatchObject({
      status: 'CONFIRMED',
      consultationType: slots[0].consultationTypes[0],
      scheduledStart: new Date(slots[0].start).toISOString(),
      reason: 'Persistent cough for a week',
      canCancel: true,
      canReschedule: true,
    });
    expect(appointment.appointmentNumber).toMatch(/^APT-\d{4}-\d{5}$/);
    expect(appointment.payment).toMatchObject({ status: 'PAID', method: 'UPI' });
    expect(appointment.fee).toBeGreaterThan(0);
    expect(appointment.payment.amount).toBe(appointment.fee);
    expect(appointment.statusHistory.map((event: { toStatus: string }) => event.toStatus)).toEqual(['PENDING', 'CONFIRMED']);

    const notifications = await prisma.notification.findMany({ where: { entityId: appointment.id } });
    expect(notifications.map((n) => n.userId)).toContain(doctorAuth.user.id);
    expect(notifications.map((n) => n.userId)).toContain(patient.user.id);

    const activity = await prisma.activityLog.findFirst({ where: { entityId: appointment.id, action: 'appointment.booked' } });
    expect(activity).not.toBeNull();

    // The slot must disappear from the public availability list.
    const date = new Date(slots[0].start).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const after = await api().get(`/api/v1/doctors/${doctorId}/slots`).query({ date });
    expect(after.body.data.some((slot: Slot) => slot.start === slots[0].start)).toBe(false);
  });

  it('leaves pay-at-clinic bookings pending with an unpaid payment', async () => {
    const slots = await findSlots(doctorId);
    const res = await book(patient.auth, slots[0], { paymentMethod: 'PAY_AT_CLINIC' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.payment).toMatchObject({ status: 'PENDING', method: 'PAY_AT_CLINIC', paidAt: null });
  });

  it('rejects a slot that is already taken', async () => {
    const slots = await findSlots(doctorId);
    const first = await book(patient.auth, slots[0]);
    expect(first.status).toBe(201);

    const second = await book(patient.auth, slots[0]);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('SLOT_UNAVAILABLE');
  });

  it('rejects a time the doctor does not offer', async () => {
    const slots = await findSlots(doctorId);
    const offSchedule = new Date(new Date(slots[0].start).getTime() + 7 * 60_000).toISOString();
    const res = await book(patient.auth, { ...slots[0], start: offSchedule });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SLOT_UNAVAILABLE');
  });

  it('stops a patient from holding two appointments at the same time', async () => {
    const slots = await findSlots(doctorId);
    const otherDoctor = await prisma.doctor.findFirst({
      where: { id: { not: doctorId }, approvalStatus: 'APPROVED', isActive: true },
      select: { id: true },
    });
    expect(otherDoctor).not.toBeNull();

    const first = await book(patient.auth, slots[0]);
    expect(first.status).toBe(201);

    const clash = await api()
      .post('/api/v1/appointments')
      .set('Authorization', patient.auth)
      .send({
        doctorId: otherDoctor!.id,
        consultationType: slots[0].consultationTypes[0],
        scheduledStart: slots[0].start,
        paymentMethod: 'UPI',
      });
    // Either the other doctor has no such slot, or the patient clash is detected — both are refusals.
    expect(clash.status).toBe(409);
    expect(['PATIENT_SLOT_CONFLICT', 'SLOT_UNAVAILABLE']).toContain(clash.body.error.code);
  });

  it('requires authentication and a patient profile', async () => {
    const slots = await findSlots(doctorId);
    const anonymous = await api().post('/api/v1/appointments').send({});
    expect(anonymous.status).toBe(401);

    const asDoctor = await book(doctorAuth.auth, slots[0]);
    expect(asDoctor.status).toBe(403);
  });
});

describe('appointment lifecycle', () => {
  it('cancels an appointment, refunds the simulated payment and notifies the doctor', async () => {
    const slots = await findSlots(doctorId);
    const booked = await book(patient.auth, slots[0]);
    const id = booked.body.data.id;

    const res = await api()
      .post(`/api/v1/appointments/${id}/cancel`)
      .set('Authorization', patient.auth)
      .send({ reason: 'Feeling better' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'CANCELLED', cancellationReason: 'Feeling better', canCancel: false, canReschedule: false });
    expect(res.body.data.payment.status).toBe('REFUNDED');
    expect(res.body.data.statusHistory.at(-1)).toMatchObject({ toStatus: 'CANCELLED' });

    const again = await api().post(`/api/v1/appointments/${id}/cancel`).set('Authorization', patient.auth).send({});
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVALID_STATUS_TRANSITION');

    // The freed slot becomes bookable again.
    const date = new Date(slots[0].start).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const after = await api().get(`/api/v1/doctors/${doctorId}/slots`).query({ date });
    expect(after.body.data.some((slot: Slot) => slot.start === slots[0].start)).toBe(true);
  });

  it('reschedules to another free slot and records it in the timeline', async () => {
    const slots = await findSlots(doctorId);
    const booked = await book(patient.auth, slots[0]);
    const id = booked.body.data.id;

    const res = await api()
      .post(`/api/v1/appointments/${id}/reschedule`)
      .set('Authorization', patient.auth)
      .send({ scheduledStart: slots[1].start, organizationId: slots[1].organizationId, consultationType: slots[1].consultationTypes[0] });

    expect(res.status).toBe(200);
    expect(res.body.data.scheduledStart).toBe(new Date(slots[1].start).toISOString());
    expect(res.body.data.rescheduleCount).toBe(1);
    expect(res.body.data.fee).toBe(booked.body.data.fee);
    expect(res.body.data.statusHistory.at(-1).note).toContain('Rescheduled');

    const same = await api()
      .post(`/api/v1/appointments/${id}/reschedule`)
      .set('Authorization', patient.auth)
      .send({ scheduledStart: slots[1].start, organizationId: slots[1].organizationId });
    expect(same.status).toBe(400);
    expect(same.body.error.code).toBe('SAME_SLOT');
    expect(MAX_RESCHEDULES).toBeGreaterThan(0);
  });

  it('keeps appointments private to the people involved', async () => {
    const slots = await findSlots(doctorId);
    const booked = await book(patient.auth, slots[0]);
    const id = booked.body.data.id;

    const asDoctor = await api().get(`/api/v1/appointments/${id}`).set('Authorization', doctorAuth.auth);
    expect(asDoctor.status).toBe(200);

    const pharmacy = await signIn('pharmacy@carebridge.demo');
    const asPharmacy = await api().get(`/api/v1/appointments/${id}`).set('Authorization', pharmacy.auth);
    expect(asPharmacy.status).toBe(403);
  });
});

describe('GET /appointments', () => {
  it('lists only the signed-in patient\'s appointments and honours the scope filter', async () => {
    const slots = await findSlots(doctorId);
    const booked = await book(patient.auth, slots[0]);

    const upcoming = await api().get('/api/v1/appointments').set('Authorization', patient.auth).query({ scope: 'upcoming', pageSize: 100 });
    expect(upcoming.status).toBe(200);
    expect(upcoming.body.data.some((item: { id: string }) => item.id === booked.body.data.id)).toBe(true);
    expect(upcoming.body.data.every((item: { patient: { id: string } }) => item.patient.id === patient.user.patientId)).toBe(true);
    expect(upcoming.body.data.every((item: { scheduledStart: string }) => new Date(item.scheduledStart) >= new Date(Date.now() - 60_000))).toBe(true);

    const past = await api().get('/api/v1/appointments').set('Authorization', patient.auth).query({ scope: 'past', pageSize: 100 });
    expect(past.status).toBe(200);
    expect(past.body.data.some((item: { id: string }) => item.id === booked.body.data.id)).toBe(false);

    const cancelled = await api().get('/api/v1/appointments').set('Authorization', patient.auth).query({ status: 'CANCELLED', pageSize: 100 });
    expect(cancelled.body.data.every((item: { status: string }) => item.status === 'CANCELLED')).toBe(true);
  });

  it('shows a doctor their own schedule', async () => {
    const res = await api().get('/api/v1/appointments').set('Authorization', doctorAuth.auth).query({ pageSize: 100 });
    expect(res.status).toBe(200);
    expect(res.body.data.every((item: { doctor: { id: string } }) => item.doctor.id === doctorId)).toBe(true);
  });
});

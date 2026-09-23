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
let otherDoctorAuth: Awaited<ReturnType<typeof signIn>>;
let doctorId: string;

async function findSlot(doctorIdValue: string): Promise<Slot> {
  for (let offset = 0; offset <= 14; offset++) {
    const date = new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
    const res = await api().get(`/api/v1/doctors/${doctorIdValue}/slots`).query({ date });
    if (res.body.data.length) return res.body.data[0];
  }
  throw new Error('No free slot was found for the test doctor.');
}

/** Books a fresh appointment as the patient and returns its id. */
async function bookAppointment(paymentMethod = 'UPI'): Promise<string> {
  const slot = await findSlot(doctorId);
  const res = await api()
    .post('/api/v1/appointments')
    .set('Authorization', patientAuth.auth)
    .send({
      doctorId,
      organizationId: slot.organizationId,
      consultationType: slot.consultationTypes[0],
      scheduledStart: slot.start,
      reason: 'Itchy rash on both forearms',
      paymentMethod,
    });
  expect(res.status).toBe(201);
  return res.body.data.id;
}

async function startConsultation(appointmentId: string) {
  const res = await api().post(`/api/v1/appointments/${appointmentId}/consultation`).set('Authorization', doctorAuth.auth).send({});
  expect(res.status).toBe(201);
  return res.body.data;
}

const samplePrescription = (consultationId: string) => ({
  consultationId,
  diagnosis: 'Contact dermatitis (demo)',
  advice: 'Avoid the suspected detergent.',
  items: [
    { medicineName: 'Demo Hydrocortisone 1% Cream', dosage: 'Thin layer', frequency: 'Twice daily', duration: '7 days', timing: 'Morning and night', instructions: 'Apply only on affected patches.', quantity: 1 },
  ],
});

beforeAll(async () => {
  doctorAuth = await signIn('doctor@carebridge.demo');
  patientAuth = await registerPatient('consultation');
  doctorId = doctorAuth.user.doctorId;

  // Any other approved doctor, for the cross-doctor access checks.
  const other = await prisma.doctor.findFirst({
    where: { id: { not: doctorId }, approvalStatus: 'APPROVED', isActive: true, user: { status: 'ACTIVE' } },
    select: { user: { select: { email: true } } },
  });
  otherDoctorAuth = await signIn(other!.user.email);
});

describe('POST /appointments/:id/consultation', () => {
  it('starts a consultation, moves the appointment into it, and is idempotent', async () => {
    const appointmentId = await bookAppointment();
    const consultation = await startConsultation(appointmentId);

    expect(consultation).toMatchObject({ appointmentId, status: 'IN_PROGRESS', prescriptionId: null });
    // The patient's stated reason seeds the chief complaint for the doctor to edit.
    expect(consultation.chiefComplaint).toBe('Itchy rash on both forearms');
    expect(consultation.previousPrescriptions).toBeInstanceOf(Array);

    const appointment = await api().get(`/api/v1/appointments/${appointmentId}`).set('Authorization', doctorAuth.auth);
    expect(appointment.body.data.status).toBe('IN_CONSULTATION');
    expect(appointment.body.data.consultationId).toBe(consultation.id);

    // Re-opening the workspace returns the same consultation rather than creating another.
    const again = await startConsultation(appointmentId);
    expect(again.id).toBe(consultation.id);
    expect(await prisma.consultation.count({ where: { appointmentId } })).toBe(1);
  });

  it('refuses to start before the appointment is confirmed', async () => {
    const appointmentId = await bookAppointment('PAY_AT_CLINIC'); // stays PENDING
    const res = await api().post(`/api/v1/appointments/${appointmentId}/consultation`).set('Authorization', doctorAuth.auth).send({});
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('refuses another doctor and the patient', async () => {
    const appointmentId = await bookAppointment();

    const asOtherDoctor = await api().post(`/api/v1/appointments/${appointmentId}/consultation`).set('Authorization', otherDoctorAuth.auth).send({});
    expect(asOtherDoctor.status).toBe(403);

    const asPatient = await api().post(`/api/v1/appointments/${appointmentId}/consultation`).set('Authorization', patientAuth.auth).send({});
    expect(asPatient.status).toBe(403);
  });
});

describe('consultation notes', () => {
  it('saves what the doctor types and refuses everyone else', async () => {
    const consultation = await startConsultation(await bookAppointment());

    const res = await api()
      .patch(`/api/v1/consultations/${consultation.id}`)
      .set('Authorization', doctorAuth.auth)
      .send({ observations: 'Well-defined erythematous patches.', diagnosis: 'Contact dermatitis (demo)', notes: 'Likely detergent reaction.', followUpDate: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10) });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      observations: 'Well-defined erythematous patches.',
      diagnosis: 'Contact dermatitis (demo)',
      notes: 'Likely detergent reaction.',
    });
    expect(res.body.data.followUpDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const asPatient = await api().patch(`/api/v1/consultations/${consultation.id}`).set('Authorization', patientAuth.auth).send({ notes: 'nope' });
    expect(asPatient.status).toBe(403);

    // The patient may still read their own consultation.
    const readByPatient = await api().get(`/api/v1/consultations/${consultation.id}`).set('Authorization', patientAuth.auth);
    expect(readByPatient.status).toBe(200);
  });
});

describe('prescriptions', () => {
  it('keeps a draft private, then publishes it to the patient on issue', async () => {
    const consultation = await startConsultation(await bookAppointment());

    const draft = await api().post('/api/v1/prescriptions').set('Authorization', doctorAuth.auth).send(samplePrescription(consultation.id));
    expect(draft.status).toBe(201);
    expect(draft.body.data).toMatchObject({ status: 'DRAFT', issuedAt: null, itemCount: 1 });
    expect(draft.body.data.prescriptionNumber).toMatch(/^RX-\d{4}-\d{5}$/);
    expect(draft.body.data.items[0]).toMatchObject({ dosage: 'Thin layer', frequency: 'Twice daily', duration: '7 days' });

    const id = draft.body.data.id;

    // A draft belongs to its author alone.
    const patientPeek = await api().get(`/api/v1/prescriptions/${id}`).set('Authorization', patientAuth.auth);
    expect(patientPeek.status).toBe(403);

    const patientListBefore = await api().get('/api/v1/prescriptions').set('Authorization', patientAuth.auth).query({ pageSize: 100 });
    expect(patientListBefore.body.data.some((p: { id: string }) => p.id === id)).toBe(false);

    const issued = await api().post(`/api/v1/prescriptions/${id}/issue`).set('Authorization', doctorAuth.auth).send({});
    expect(issued.status).toBe(200);
    expect(issued.body.data.status).toBe('ISSUED');
    expect(issued.body.data.issuedAt).toEqual(expect.any(String));
    expect(issued.body.data.validUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const patientView = await api().get(`/api/v1/prescriptions/${id}`).set('Authorization', patientAuth.auth);
    expect(patientView.status).toBe(200);
    expect(patientView.body.data.items).toHaveLength(1);

    const notification = await prisma.notification.findFirst({ where: { entityId: id, type: 'PRESCRIPTION_ISSUED' } });
    expect(notification?.userId).toBe(patientAuth.user.id);

    // Issued prescriptions are read-only.
    const edit = await api().patch(`/api/v1/prescriptions/${id}`).set('Authorization', doctorAuth.auth).send({ advice: 'changed' });
    expect(edit.status).toBe(409);
    expect(edit.body.error.code).toBe('PRESCRIPTION_ISSUED');
  });

  it('allows only one prescription per consultation', async () => {
    const consultation = await startConsultation(await bookAppointment());
    const first = await api().post('/api/v1/prescriptions').set('Authorization', doctorAuth.auth).send(samplePrescription(consultation.id));
    expect(first.status).toBe(201);

    const second = await api().post('/api/v1/prescriptions').set('Authorization', doctorAuth.auth).send(samplePrescription(consultation.id));
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('PRESCRIPTION_EXISTS');
  });

  it('rejects a prescription written by someone who is not the treating doctor', async () => {
    const consultation = await startConsultation(await bookAppointment());

    const asOtherDoctor = await api().post('/api/v1/prescriptions').set('Authorization', otherDoctorAuth.auth).send(samplePrescription(consultation.id));
    expect(asOtherDoctor.status).toBe(403);

    const asPatient = await api().post('/api/v1/prescriptions').set('Authorization', patientAuth.auth).send(samplePrescription(consultation.id));
    expect(asPatient.status).toBe(403);
  });

  it('replaces the whole medicine list on update', async () => {
    const consultation = await startConsultation(await bookAppointment());
    const draft = await api().post('/api/v1/prescriptions').set('Authorization', doctorAuth.auth).send(samplePrescription(consultation.id));

    const updated = await api()
      .patch(`/api/v1/prescriptions/${draft.body.data.id}`)
      .set('Authorization', doctorAuth.auth)
      .send({
        items: [
          { medicineName: 'Demo Levocetirizine 5mg', dosage: '1 tablet', frequency: 'Once daily', duration: '10 days', timing: 'Night', quantity: 1 },
          { medicineName: 'Demo Calamine Lotion', dosage: 'Apply as needed', frequency: 'For itching', duration: '7 days', quantity: 1 },
        ],
      });

    expect(updated.status).toBe(200);
    expect(updated.body.data.items).toHaveLength(2);
    expect(updated.body.data.items[0].medicineName).toBe('Demo Levocetirizine 5mg');
    expect(updated.body.data.items[1].sortOrder).toBe(1);
  });
});

describe('POST /consultations/:id/complete', () => {
  it('closes the visit, issues the draft prescription and settles a pay-at-clinic fee', async () => {
    // Pay-at-clinic booking, confirmed by the doctor, so the payment starts PENDING.
    const appointmentId = await bookAppointment('PAY_AT_CLINIC');
    const confirmed = await api().post(`/api/v1/appointments/${appointmentId}/status`).set('Authorization', doctorAuth.auth).send({ status: 'CONFIRMED' });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.payment.status).toBe('PENDING');

    const consultation = await startConsultation(appointmentId);
    const draft = await api().post('/api/v1/prescriptions').set('Authorization', doctorAuth.auth).send(samplePrescription(consultation.id));
    expect(draft.body.data.status).toBe('DRAFT');

    const completed = await api().post(`/api/v1/consultations/${consultation.id}/complete`).set('Authorization', doctorAuth.auth).send({});
    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe('COMPLETED');
    expect(completed.body.data.completedAt).toEqual(expect.any(String));
    // A draft left open at the end of the visit is issued, or it would never reach the patient.
    expect(completed.body.data.prescription.status).toBe('ISSUED');

    const appointment = await api().get(`/api/v1/appointments/${appointmentId}`).set('Authorization', doctorAuth.auth);
    expect(appointment.body.data.status).toBe('COMPLETED');
    expect(appointment.body.data.payment.status).toBe('PAID');
    expect(appointment.body.data.statusHistory.at(-1)).toMatchObject({ toStatus: 'COMPLETED' });

    // Completed consultations are locked.
    const edit = await api().patch(`/api/v1/consultations/${consultation.id}`).set('Authorization', doctorAuth.auth).send({ notes: 'late addition' });
    expect(edit.status).toBe(409);
    expect(edit.body.error.code).toBe('CONSULTATION_COMPLETED');

    const again = await api().post(`/api/v1/consultations/${consultation.id}/complete`).set('Authorization', doctorAuth.auth).send({});
    expect(again.status).toBe(409);
  });
});

describe('GET /consultations', () => {
  it('scopes the list to the signed-in doctor and supports the active filter', async () => {
    const consultation = await startConsultation(await bookAppointment());

    const mine = await api().get('/api/v1/consultations').set('Authorization', doctorAuth.auth).query({ scope: 'active', pageSize: 100 });
    expect(mine.status).toBe(200);
    expect(mine.body.data.every((item: { doctor: { id: string } }) => item.doctor.id === doctorId)).toBe(true);
    expect(mine.body.data.some((item: { id: string }) => item.id === consultation.id)).toBe(true);

    const otherDoctorsList = await api().get('/api/v1/consultations').set('Authorization', otherDoctorAuth.auth).query({ pageSize: 100 });
    expect(otherDoctorsList.body.data.some((item: { id: string }) => item.id === consultation.id)).toBe(false);
  });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { api, registerPatient, signIn } from './helpers';

let patient: Awaited<ReturnType<typeof registerPatient>>;
let other: typeof patient;
let doctor: Awaited<ReturnType<typeof signIn>>;

const address = {
  label: 'Home',
  recipient: 'Test Patient',
  phone: '+91 98450 10101',
  line1: '12 MG Road',
  locality: 'Indiranagar',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560038',
};

beforeAll(async () => {
  patient = await registerPatient('profile');
  other = await registerPatient('profile.other');
  doctor = await signIn('doctor@carebridge.demo');
});
afterAll(async () => {
  for (const user of [patient, other]) if (user) await prisma.user.delete({ where: { id: user.user.id } });
  await prisma.$disconnect();
});

describe('patient profile', () => {
  it('requires a signed-in patient', async () => {
    expect((await api().get('/api/v1/profile')).status).toBe(401);
    expect((await api().get('/api/v1/profile').set('Authorization', doctor.auth)).status).toBe(403);
  });

  it('reads and updates profile fields', async () => {
    const initial = await api().get('/api/v1/profile').set('Authorization', patient.auth);
    expect(initial.status).toBe(200);
    expect(initial.body.data).toMatchObject({ firstName: 'Test', dateOfBirth: '1992-04-18', gender: 'MALE' });

    const res = await api()
      .patch('/api/v1/profile')
      .set('Authorization', patient.auth)
      .send({ firstName: 'Asha', gender: 'FEMALE', emergencyContactName: 'Ravi', emergencyContactPhone: '+91 90000 00000', emergencyContactRelation: 'Brother' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ firstName: 'Asha', lastName: 'Patient', gender: 'FEMALE', emergencyContactName: 'Ravi', dateOfBirth: '1992-04-18' });

    const cleared = await api().patch('/api/v1/profile').set('Authorization', patient.auth).send({ emergencyContactName: '', phone: '' });
    expect(cleared.body.data).toMatchObject({ emergencyContactName: null, phone: null });
  });

  it('rejects invalid input and unknown fields', async () => {
    for (const body of [{ avatarUrl: 'javascript:alert(1)' }, { dateOfBirth: '2999-01-01' }, { gender: 'X' }, { email: 'new@example.demo' }, { firstName: ' ' }]) {
      expect((await api().patch('/api/v1/profile').set('Authorization', patient.auth).send(body)).status).toBe(400);
    }
  });
});

describe('saved addresses', () => {
  it('creates, edits, re-defaults and deletes addresses owned by the patient', async () => {
    const auth = patient.auth;
    const first = await api().post('/api/v1/profile/addresses').set('Authorization', auth).send(address);
    expect(first.status).toBe(201);
    expect(first.body.data.isDefault).toBe(true);

    const second = await api().post('/api/v1/profile/addresses').set('Authorization', auth).send({ ...address, label: 'Work', isDefault: true });
    expect(second.body.data.isDefault).toBe(true);

    let list = await api().get('/api/v1/profile/addresses').set('Authorization', auth);
    expect(list.body.data.map((a: { label: string; isDefault: boolean }) => [a.label, a.isDefault])).toEqual([
      ['Work', true],
      ['Home', false],
    ]);

    const edited = await api().put(`/api/v1/profile/addresses/${first.body.data.id}`).set('Authorization', auth).send({ ...address, line1: '99 New Street' });
    expect(edited.status).toBe(200);
    expect(edited.body.data).toMatchObject({ line1: '99 New Street', isDefault: false });

    expect((await api().delete(`/api/v1/profile/addresses/${second.body.data.id}`).set('Authorization', auth)).status).toBe(200);
    list = await api().get('/api/v1/profile/addresses').set('Authorization', auth);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ id: first.body.data.id, isDefault: true });
  });

  it("cannot see or modify another patient's addresses", async () => {
    const mine = await api().post('/api/v1/profile/addresses').set('Authorization', patient.auth).send({ ...address, label: 'Private' });
    const id = mine.body.data.id;
    expect((await api().put(`/api/v1/profile/addresses/${id}`).set('Authorization', other.auth).send(address)).status).toBe(404);
    expect((await api().delete(`/api/v1/profile/addresses/${id}`).set('Authorization', other.auth)).status).toBe(404);
    expect((await api().get('/api/v1/profile/addresses').set('Authorization', other.auth)).body.data).toEqual([]);
  });

  it('validates address input', async () => {
    for (const body of [{ ...address, postalCode: '123' }, { ...address, line1: '' }, { ...address, userId: other.user.id }]) {
      expect((await api().post('/api/v1/profile/addresses').set('Authorization', patient.auth).send(body)).status).toBe(400);
    }
  });
});

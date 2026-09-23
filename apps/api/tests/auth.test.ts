import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@carebridge/shared';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';

const app = createApp();
const api = () => request(app);

async function login(email: string, password = DEMO_PASSWORD) {
  return api().post('/api/v1/auth/login').send({ email, password });
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /auth/login', () => {
  it.each(DEMO_ACCOUNTS.map((account) => [account.key, account] as const))('signs in the %s demo account', async (_key, account) => {
    const res = await login(account.email);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe(account.email);
    expect(res.body.data.user.roles).toContain(account.role);
  });

  it('returns tenant memberships and profile ids', async () => {
    const pharmacy = await login('pharmacy@carebridge.demo');
    expect(pharmacy.body.data.user.portal).toBe('pharmacy');
    expect(pharmacy.body.data.user.memberships).toEqual([
      expect.objectContaining({ organizationName: 'City Care Pharmacy', organizationType: 'PHARMACY', staffRole: 'ADMIN' }),
    ]);

    const doctor = await login('doctor@carebridge.demo');
    expect(doctor.body.data.user.doctorId).toEqual(expect.any(String));
    expect(doctor.body.data.user.permissions).toContain('prescription.create');

    const patient = await login('PATIENT@carebridge.demo'); // email is case-insensitive
    expect(patient.status).toBe(200);
    expect(patient.body.data.user.patientId).toEqual(expect.any(String));
    expect(patient.body.data.user.permissions).not.toContain('prescription.create');
  });

  it('rejects a wrong password with a generic error', async () => {
    const res = await login('patient@carebridge.demo', 'Wrong@123');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password.' } });
  });

  it('rejects unknown emails with the same error', async () => {
    const res = await login('nobody@carebridge.demo');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('validates the request body', async () => {
    const res = await api().post('/api/v1/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('blocks deactivated accounts, including existing sessions', async () => {
    const email = 'reception.greencare@carebridge.demo';
    const session = await login(email);
    const token = session.body.data.token as string;

    await prisma.user.update({ where: { email }, data: { status: 'INACTIVE' } });
    try {
      expect((await login(email)).body.error.code).toBe('ACCOUNT_INACTIVE');
      const me = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      expect(me.status).toBe(403);
    } finally {
      await prisma.user.update({ where: { email }, data: { status: 'ACTIVE' } });
    }
  });
});

describe('GET /auth/me', () => {
  it('requires a token', async () => {
    const res = await api().get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a tampered token', async () => {
    const res = await api().get('/api/v1/auth/me').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns the current user', async () => {
    const { body } = await login('clinic@carebridge.demo');
    const res = await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${body.data.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ firstName: 'Anita', lastName: 'Desai', portal: 'organization' });
  });
});

describe('POST /auth/register', () => {
  const email = `new.patient.${Date.now()}@example.demo`;

  it('creates a patient account and signs in', async () => {
    const res = await api().post('/api/v1/auth/register').send({
      email,
      password: 'Secure@2026',
      firstName: 'Test',
      lastName: 'Patient',
      dateOfBirth: '1995-05-05',
      gender: 'FEMALE',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.roles).toEqual(['PATIENT']);
    expect(res.body.data.user.patientId).toEqual(expect.any(String));

    const patient = await prisma.patient.findUnique({ where: { id: res.body.data.user.patientId } });
    expect(patient?.patientCode).toMatch(/^PT-\d{5}$/);
    const log = await prisma.activityLog.findFirst({ where: { action: 'patient.registered', entityId: res.body.data.user.id } });
    expect(log).not.toBeNull();
  });

  it('rejects a duplicate email', async () => {
    const res = await api().post('/api/v1/auth/register').send({ email, password: 'Secure@2026', firstName: 'A', lastName: 'B' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('enforces password strength', async () => {
    const res = await api().post('/api/v1/auth/register').send({ email: 'weak@example.demo', password: 'password', firstName: 'A', lastName: 'B' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toContain('password');
  });
});

describe('mock password reset', () => {
  it('resets a password once with the demo token', async () => {
    const email = 'support.kiran@carebridge.demo';
    const requested = await api().post('/api/v1/auth/forgot-password').send({ email });
    expect(requested.status).toBe(200);
    const token = requested.body.data.demoResetToken as string;
    expect(token).toEqual(expect.any(String));

    const reset = await api().post('/api/v1/auth/reset-password').send({ token, password: 'Changed@2026' });
    expect(reset.status).toBe(200);
    expect((await login(email, 'Changed@2026')).status).toBe(200);

    const reuse = await api().post('/api/v1/auth/reset-password').send({ token, password: 'Another@2026' });
    expect(reuse.status).toBe(400);
    expect(reuse.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('does not reveal whether an email exists', async () => {
    const res = await api().post('/api/v1/auth/forgot-password').send({ email: 'ghost@example.demo' });
    expect(res.status).toBe(200);
    expect(res.body.data.demoResetToken).toBeUndefined();
  });
});

describe('route authorization', () => {
  it('requires authentication for demo reset', async () => {
    expect((await api().post('/api/v1/demo/reset')).status).toBe(401);
  });

  it.each(['patient@carebridge.demo', 'doctor@carebridge.demo', 'pharmacy@carebridge.demo', 'employee@carebridge.demo'])(
    'forbids %s from resetting demo data',
    async (email) => {
      const { body } = await login(email);
      const res = await api().post('/api/v1/demo/reset').set('Authorization', `Bearer ${body.data.token}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    },
  );

  it('returns a consistent 404 for unknown routes', async () => {
    const res = await api().get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: 'ROUTE_NOT_FOUND' } });
  });
});

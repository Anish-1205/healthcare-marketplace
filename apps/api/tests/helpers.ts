import request from 'supertest';
import { DEMO_PASSWORD } from '@carebridge/shared';
import { createApp } from '../src/app';

export const app = createApp();
export const api = () => request(app);

/** Sign in and return the bearer token plus user payload. */
export async function signIn(email: string, password = DEMO_PASSWORD) {
  const res = await api().post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.data.token as string, user: res.body.data.user, auth: `Bearer ${res.body.data.token}` };
}

/** Unique email for tests that create accounts. */
export const uniqueEmail = (prefix: string) => `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.demo`;

/**
 * A brand-new patient with an empty calendar. Booking tests use one of these rather than the
 * seeded demo patient, whose diary is already full of appointments they would clash with.
 */
export async function registerPatient(prefix = 'test.patient') {
  const res = await api()
    .post('/api/v1/auth/register')
    .send({
      email: uniqueEmail(prefix),
      password: 'Secure@2026',
      firstName: 'Test',
      lastName: 'Patient',
      phone: '+91 98450 10101',
      dateOfBirth: '1992-04-18',
      gender: 'MALE',
    });
  if (res.status !== 201) throw new Error(`Could not register a test patient: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.data.token as string, user: res.body.data.user, auth: `Bearer ${res.body.data.token}` };
}

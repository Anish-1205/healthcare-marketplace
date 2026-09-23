import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { api, registerPatient, signIn } from './helpers';

let patient: Awaited<ReturnType<typeof registerPatient>>;
let seededPatient: Awaited<ReturnType<typeof signIn>>;
let doctor: Awaited<ReturnType<typeof signIn>>;
let addressId: string;
let testId: string;
let bookingId: string;
const collectionDate = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);

beforeAll(async () => {
  patient = await registerPatient('labs');
  seededPatient = await signIn('patient@carebridge.demo');
  doctor = await signIn('doctor@carebridge.demo');
  const address = await prisma.address.create({ data: { userId: patient.user.id, label: 'Home', recipient: 'Test Patient', phone: '9000000000', line1: '15 Lab Street', locality: 'Central District', city: 'Demo City', state: 'Karnataka', postalCode: '560001', isDefault: true } });
  addressId = address.id;
  testId = (await prisma.labTest.findUniqueOrThrow({ where: { code: 'CBC' } })).id;
});

afterAll(async () => {
  const patientId = patient.user.patientId as string;
  await prisma.payment.deleteMany({ where: { patientId } });
  await prisma.labBooking.deleteMany({ where: { patientId } });
  await prisma.document.deleteMany({ where: { patientId } });
  await prisma.user.delete({ where: { id: patient.user.id } });
  await prisma.$disconnect();
});

describe('lab test catalogue', () => {
  it('lists and filters active tests and packages without authentication', async () => {
    const list = await api().get('/api/v1/lab-tests?pageSize=5&popular=true');
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThan(0);
    expect(list.body.data.every((test: { isPopular: boolean }) => test.isPopular)).toBe(true);
    const packages = await api().get('/api/v1/lab-tests?package=true&pageSize=20');
    expect(packages.body.data.every((test: { isPackage: boolean }) => test.isPackage)).toBe(true);
  });

  it('returns package contents and catalogue categories', async () => {
    const detail = await api().get('/api/v1/lab-tests/basic-health-checkup');
    expect(detail.status).toBe(200);
    expect(detail.body.data.isPackage).toBe(true);
    expect(detail.body.data.includedTests.length).toBeGreaterThanOrEqual(5);
    const categories = await api().get('/api/v1/lab-tests/categories');
    expect(categories.body.data).toContain('Packages');
  });
});

describe('patient lab booking', () => {
  it('requires a patient and returns only their saved addresses', async () => {
    expect((await api().get('/api/v1/lab-bookings/context')).status).toBe(401);
    expect((await api().get('/api/v1/lab-bookings/context').set('Authorization', doctor.auth)).status).toBe(403);
    const context = await api().get('/api/v1/lab-bookings/context').set('Authorization', patient.auth);
    expect(context.status).toBe(200);
    expect(context.body.data.addresses).toHaveLength(1);
    expect(context.body.data.addresses[0].id).toBe(addressId);
    expect(context.body.data.timeSlots).toContain('08:00 - 09:00');
  });

  it('creates a paid booking using catalogue pricing and emits audit records', async () => {
    const test = await prisma.labTest.findUniqueOrThrow({ where: { id: testId } });
    const res = await api().post('/api/v1/lab-bookings').set('Authorization', patient.auth).send({ testIds: [testId], collectionType: 'HOME_COLLECTION', scheduledDate: collectionDate, timeSlot: '08:00 - 09:00', addressId, paymentMethod: 'UPI', totalAmount: 1 });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    bookingId = res.body.data.id;
    expect(res.body.data).toMatchObject({ collectionType: 'HOME_COLLECTION', status: 'BOOKED', totalAmount: Number(test.price) });
    expect(res.body.data.payment).toMatchObject({ method: 'UPI', status: 'PAID', amount: Number(test.price) });
    expect(await prisma.notification.count({ where: { userId: patient.user.id, entityId: bookingId, type: 'LAB_BOOKING_CONFIRMED' } })).toBe(1);
    expect(await prisma.activityLog.count({ where: { entityId: bookingId, action: 'lab_booking.created' } })).toBe(1);
  });

  it('enforces address ownership, test availability, and booking isolation', async () => {
    const foreignAddress = await prisma.address.findFirstOrThrow({ where: { userId: seededPatient.user.id } });
    const foreign = await api().post('/api/v1/lab-bookings').set('Authorization', patient.auth).send({ testIds: [testId], collectionType: 'HOME_COLLECTION', scheduledDate: collectionDate, timeSlot: '08:00 - 09:00', addressId: foreignAddress.id, paymentMethod: 'CARD' });
    expect(foreign.status).toBe(404);
    const hidden = await api().get(`/api/v1/lab-bookings/${bookingId}`).set('Authorization', seededPatient.auth);
    expect(hidden.status).toBe(404);
    const own = await api().get('/api/v1/lab-bookings').set('Authorization', patient.auth);
    expect(own.body.data.some((booking: { id: string }) => booking.id === bookingId)).toBe(true);
  });

  it('cancels a booked collection and refunds its simulated payment once', async () => {
    const cancelled = await api().post(`/api/v1/lab-bookings/${bookingId}/cancel`).set('Authorization', patient.auth);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe('CANCELLED');
    expect(cancelled.body.data.payment.status).toBe('REFUNDED');
    const again = await api().post(`/api/v1/lab-bookings/${bookingId}/cancel`).set('Authorization', patient.auth);
    expect(again.status).toBe(409);
  });
});

describe('health records', () => {
  it('combines the seeded patient’s prescriptions, consultations, documents, reports, and appointments', async () => {
    const res = await api().get('/api/v1/health-records').set('Authorization', seededPatient.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.counts).toMatchObject({ prescriptions: expect.any(Number), consultations: expect.any(Number), documents: expect.any(Number), labReports: expect.any(Number), appointments: expect.any(Number) });
    expect(res.body.data.counts.prescriptions).toBeGreaterThan(0);
    expect(res.body.data.counts.labReports).toBeGreaterThan(0);
  });

  it('validates, stores, isolates, lists, and deletes mock document metadata', async () => {
    const invalid = await api().post('/api/v1/health-records/documents').set('Authorization', patient.auth).send({ type: 'MEDICAL_REPORT', fileName: 'malware.exe', mimeType: 'application/octet-stream', sizeBytes: 100 });
    expect(invalid.status).toBe(400);
    const created = await api().post('/api/v1/health-records/documents').set('Authorization', patient.auth).send({ type: 'MEDICAL_REPORT', title: 'Demo scan', fileName: 'demo-scan.pdf', mimeType: 'application/pdf', sizeBytes: 2048, recordDate: '2026-01-15', notes: 'Uploaded during integration test.' });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect(created.body.data).toMatchObject({ title: 'Demo scan', type: 'MEDICAL_REPORT', source: 'UPLOAD' });
    const id = created.body.data.id as string;
    const list = await api().get('/api/v1/health-records/documents').set('Authorization', patient.auth);
    expect(list.body.data.some((document: { id: string }) => document.id === id)).toBe(true);
    expect((await api().delete(`/api/v1/health-records/documents/${id}`).set('Authorization', seededPatient.auth)).status).toBe(404);
    expect((await api().delete(`/api/v1/health-records/documents/${id}`).set('Authorization', patient.auth)).status).toBe(200);
    expect(await prisma.document.findUnique({ where: { id } })).toBeNull();
  });

  it('protects generated lab reports from deletion', async () => {
    const report = await prisma.document.findFirstOrThrow({ where: { patient: { userId: seededPatient.user.id }, type: 'LAB_REPORT' } });
    const res = await api().delete(`/api/v1/health-records/documents/${report.id}`).set('Authorization', seededPatient.auth);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DOCUMENT_LINKED');
  });
});

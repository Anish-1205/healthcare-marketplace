import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { api, signIn, uniqueEmail } from './helpers';

afterAll(async () => {
  await prisma.$disconnect();
});

const doctorPayload = (overrides: Record<string, unknown> = {}) => ({
  email: uniqueEmail('dr.new'),
  password: 'Secure@2026',
  firstName: 'Kiran',
  lastName: 'Desai',
  phone: '+91 98450 12345',
  gender: 'FEMALE',
  specialties: ['dermatologist', 'general-physician'],
  qualifications: 'MBBS, MD (Dermatology)',
  experienceYears: 8,
  registrationNumber: `KMC-TEST-${Date.now()}${Math.floor(Math.random() * 1000)}`,
  consultationFee: 550,
  languages: ['English', 'Kannada'],
  consultationTypes: ['IN_PERSON', 'VIDEO'],
  bio: 'Test doctor created by the onboarding suite.',
  documents: [{ type: 'LICENSE', fileName: 'licence.pdf', mimeType: 'application/pdf', sizeBytes: 250_000 }],
  ...overrides,
});

const pharmacyPayload = (overrides: Record<string, unknown> = {}) => ({
  email: uniqueEmail('owner'),
  password: 'Secure@2026',
  firstName: 'Meena',
  lastName: 'Rao',
  phone: '+91 98450 54321',
  organizationType: 'PHARMACY',
  organizationName: 'Sunshine Test Pharmacy',
  description: 'Neighbourhood pharmacy (test).',
  businessPhone: '+91 80 4000 1234',
  businessEmail: uniqueEmail('orders'),
  registrationNumber: 'REG-TEST-001',
  licenseNumber: 'DL-TEST-001',
  address: { line1: '12, Test Street', locality: 'Riverside', city: 'Bengaluru', state: 'Karnataka', postalCode: '560062' },
  opensAt: '08:00',
  closesAt: '22:00',
  pharmacy: { deliveryAvailable: true, pickupAvailable: false },
  documents: [
    { type: 'REGISTRATION_CERTIFICATE', fileName: 'registration.pdf', mimeType: 'application/pdf', sizeBytes: 300_000 },
    { type: 'LICENSE', fileName: 'drug-licence.jpg', mimeType: 'image/jpeg', sizeBytes: 500_000 },
  ],
  ...overrides,
});

describe('POST /onboarding/doctor', () => {
  it('creates a pending doctor, signs them in and notifies platform reviewers', async () => {
    const payload = doctorPayload();
    const res = await api().post('/api/v1/onboarding/doctor').send(payload);
    expect(res.status).toBe(201);
    const { user, token } = res.body.data;
    expect(token).toEqual(expect.any(String));
    expect(user).toMatchObject({ portal: 'doctor', roles: ['DOCTOR'], doctorApprovalStatus: 'PENDING_APPROVAL' });

    const doctor = await prisma.doctor.findUniqueOrThrow({ where: { id: user.doctorId }, include: { specialties: { include: { specialty: true } } } });
    expect(doctor.approvalStatus).toBe('PENDING_APPROVAL');
    expect(doctor.slug).toMatch(/^dr-kiran-desai/);
    expect(doctor.specialties.find((s) => s.isPrimary)?.specialty.slug).toBe('dermatologist');
    expect(await prisma.document.count({ where: { uploadedById: user.id, type: 'LICENSE' } })).toBe(1);

    const admin = await signIn('admin@carebridge.demo');
    const notification = await prisma.notification.findFirst({ where: { userId: admin.user.id, entityId: doctor.id, type: 'REGISTRATION_SUBMITTED' } });
    expect(notification?.link).toBe('/admin/approvals');
    expect(await prisma.activityLog.count({ where: { action: 'doctor.registered', entityId: doctor.id } })).toBe(1);
  });

  it('keeps pending doctors out of public search', async () => {
    const payload = doctorPayload({ firstName: 'Zephyrine', lastName: 'Quill' });
    expect((await api().post('/api/v1/onboarding/doctor').send(payload)).status).toBe(201);
    const search = await api().get('/api/v1/search?q=Zephyrine');
    expect(search.body.data.groups.doctors).toEqual([]);
  });

  it('rejects duplicate emails and registration numbers', async () => {
    const payload = doctorPayload();
    expect((await api().post('/api/v1/onboarding/doctor').send(payload)).status).toBe(201);

    const sameEmail = await api().post('/api/v1/onboarding/doctor').send({ ...doctorPayload(), email: payload.email });
    expect(sameEmail.status).toBe(409);
    expect(sameEmail.body.error.code).toBe('EMAIL_IN_USE');

    const sameReg = await api().post('/api/v1/onboarding/doctor').send({ ...doctorPayload(), registrationNumber: payload.registrationNumber });
    expect(sameReg.status).toBe(409);
    expect(sameReg.body.error.code).toBe('REGISTRATION_NUMBER_IN_USE');
  });

  it('validates specialties, documents and required fields', async () => {
    const badSpecialty = await api().post('/api/v1/onboarding/doctor').send(doctorPayload({ specialties: ['astrology'] }));
    expect(badSpecialty.status).toBe(400);
    expect(badSpecialty.body.error.code).toBe('UNKNOWN_SPECIALTY');

    const badFile = await api()
      .post('/api/v1/onboarding/doctor')
      .send(doctorPayload({ documents: [{ type: 'LICENSE', fileName: 'licence.exe', mimeType: 'application/x-msdownload', sizeBytes: 100 }] }));
    expect(badFile.status).toBe(400);

    const missing = await api().post('/api/v1/onboarding/doctor').send({ email: uniqueEmail('x') });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /onboarding/organization', () => {
  it('creates a pending pharmacy with its owner as admin', async () => {
    const res = await api().post('/api/v1/onboarding/organization').send(pharmacyPayload());
    expect(res.status).toBe(201);
    const { user } = res.body.data;
    expect(user.portal).toBe('pharmacy');
    expect(user.roles).toEqual(['PHARMACY_ADMIN']);
    expect(user.memberships).toEqual([
      expect.objectContaining({ organizationName: 'Sunshine Test Pharmacy', organizationType: 'PHARMACY', staffRole: 'ADMIN', approvalStatus: 'PENDING_APPROVAL' }),
    ]);

    const organizationId = user.memberships[0].organizationId;
    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    expect(organization).toMatchObject({ approvalStatus: 'PENDING_APPROVAL', acceptsPrescriptions: true, deliveryAvailable: true, pickupAvailable: false, locality: 'Riverside' });
    expect(await prisma.document.count({ where: { organizationId } })).toBe(2);

    const reviewers = await prisma.notification.count({ where: { entityId: organizationId, type: 'REGISTRATION_SUBMITTED' } });
    expect(reviewers).toBeGreaterThanOrEqual(3); // employees, admin, super admin

    // Pending pharmacies are not listed publicly.
    const search = await api().get('/api/v1/search?q=Sunshine Test');
    expect(search.body.data.groups.pharmacies).toEqual([]);
  });

  it('gives each organization a unique slug', async () => {
    const first = await api().post('/api/v1/onboarding/organization').send(pharmacyPayload({ organizationName: 'Twin Clinic', organizationType: 'CLINIC', pharmacy: undefined }));
    const second = await api().post('/api/v1/onboarding/organization').send(pharmacyPayload({ organizationName: 'Twin Clinic', organizationType: 'CLINIC', pharmacy: undefined }));
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const slugs = await prisma.organization.findMany({ where: { name: 'Twin Clinic' }, select: { slug: true, deliveryAvailable: true } });
    expect(new Set(slugs.map((s) => s.slug)).size).toBe(slugs.length);
    expect(slugs.every((s) => !s.deliveryAvailable)).toBe(true);
    expect(second.body.data.user.roles).toEqual(['CLINIC_ADMIN']);
  });

  it('validates PIN code and opening hours', async () => {
    const res = await api()
      .post('/api/v1/onboarding/organization')
      .send(pharmacyPayload({ address: { line1: '1 Road', locality: 'X', city: 'Y', state: 'Z', postalCode: '12' }, opensAt: '22:00', closesAt: '08:00' }));
    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['address.postalCode', 'closesAt']));
  });
});

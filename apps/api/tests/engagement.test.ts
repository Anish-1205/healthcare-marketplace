import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { api, registerPatient, signIn } from './helpers';
import type { Target } from '../src/modules/reviews/reviews.schemas';

let patient: Awaited<ReturnType<typeof registerPatient>>;
let other: typeof patient;
let admin: Awaited<ReturnType<typeof signIn>>;
let doctorUser: typeof admin;
let targets: Target[] = [];
let doctorId: string;
const reviews: string[] = [];
const patients: string[] = [];
beforeAll(async () => {
  patient = await registerPatient('engagement'); other = await registerPatient('engagement.other');
  patients.push(patient.user.patientId, other.user.patientId);
  admin = await signIn('admin@carebridge.demo'); doctorUser = await signIn('doctor@carebridge.demo');
  doctorId = (await prisma.doctor.findFirstOrThrow({ where: { isActive: true, approvalStatus: 'APPROVED' } })).id;
  targets = [{ targetType: 'DOCTOR', targetId: doctorId }];
  for (const type of ['CLINIC', 'HOSPITAL', 'PHARMACY'] as const) targets.push({ targetType: type, targetId: (await prisma.organization.findFirstOrThrow({ where: { type, isActive: true, approvalStatus: 'APPROVED' } })).id });
});
afterAll(async () => {
  await prisma.review.deleteMany({ where: { patientId: { in: patients } } });
  await prisma.appointment.deleteMany({ where: { patientId: { in: patients } } });
  await prisma.order.deleteMany({ where: { patientId: { in: patients } } });
  for (const target of targets) {
    const totals = await prisma.review.aggregate({ where: { ...where(target), status: 'APPROVED' }, _avg: { rating: true }, _count: true });
    const data = { avgRating: totals._avg.rating ?? 0, reviewCount: totals._count };
    if (target.targetType === 'DOCTOR') await prisma.doctor.update({ where: { id: target.targetId }, data });
    else await prisma.organization.update({ where: { id: target.targetId }, data });
  }
  for (const user of [patient, other]) if (user) await prisma.user.delete({ where: { id: user.user.id } });
  await prisma.$disconnect();
});
const where = (target: Target) => target.targetType === 'DOCTOR' ? { doctorId: target.targetId } : { organizationId: target.targetId };
const submit = (target: Target, auth = patient.auth, rating = 4) => api().post('/api/v1/reviews').set('Authorization', auth).send({ ...target, rating, text: 'Helpful and attentive care.' });
async function visit(target: Target, patientId = patient.user.patientId) {
  if (target.targetType === 'PHARMACY') return prisma.order.create({ data: { patientId, pharmacyId: target.targetId, orderNumber: `ENG-${crypto.randomUUID()}`, status: 'DELIVERED', subtotalMrp: 100, discountTotal: 0, deliveryFee: 0, platformFee: 0, totalAmount: 100, paymentMethod: 'CASH_ON_DELIVERY' } });
  const start = Date.now() - 365 * 86_400_000;
  return prisma.appointment.create({ data: { patientId, doctorId, ...(target.targetType === 'DOCTOR' ? {} : { organizationId: target.targetId }), appointmentNumber: `ENG-${crypto.randomUUID()}`, status: 'COMPLETED', scheduledStart: new Date(start), scheduledEnd: new Date(start + 1_800_000), consultationType: 'IN_PERSON', fee: 500 } });
}
async function assertTotals(target: Target) {
  const totals = await prisma.review.aggregate({ where: { ...where(target), status: 'APPROVED' }, _avg: { rating: true }, _count: true });
  const provider = target.targetType === 'DOCTOR' ? await prisma.doctor.findUniqueOrThrow({ where: { id: target.targetId } }) : await prisma.organization.findUniqueOrThrow({ where: { id: target.targetId } });
  expect(provider.reviewCount).toBe(totals._count);
  expect(Number(provider.avgRating)).toBeCloseTo(totals._avg.rating ?? 0, 1);
}

describe('reviews', () => {
  it('requires patient authentication and rejects staff creation', async () => {
    expect((await api().post('/api/v1/reviews').send({})).status).toBe(401);
    expect((await submit(targets[0], doctorUser.auth)).status).toBe(403);
    expect((await api().get('/api/v1/reviews?mine=true')).status).toBe(401);
  });
  it('rejects invalid ratings, blank text and client-supplied owner/status', async () => {
    for (const extra of [{ rating: 0 }, { rating: 6 }, { rating: 2.5 }, { text: ' ' }, { status: 'APPROVED' }, { patientId: other.user.patientId }]) {
      expect((await api().post('/api/v1/reviews').set('Authorization', patient.auth).send({ ...targets[0], rating: 4, text: 'Good care', ...extra })).status).toBe(400);
    }
  });
  for (const index of [0, 1, 2, 3]) it(`enforces usage and pending visibility for ${['doctor', 'clinic', 'hospital', 'pharmacy'][index]}`, async () => {
    const target = targets[index];
    expect((await submit(target)).status).toBe(403);
    const used = await visit(target);
    // Non-completed visits / non-delivered orders never qualify.
    if (index === 3) await prisma.order.update({ where: { id: used.id }, data: { status: 'CONFIRMED' } });
    else await prisma.appointment.update({ where: { id: used.id }, data: { status: 'CONFIRMED' } });
    expect((await submit(target)).status).toBe(403);
    if (index === 3) await prisma.order.update({ where: { id: used.id }, data: { status: 'DELIVERED' } });
    else await prisma.appointment.update({ where: { id: used.id }, data: { status: 'COMPLETED' } });
    expect((await api().get('/api/v1/reviews/eligibility').query(target).set('Authorization', patient.auth)).body.data.eligible).toBe(true);
    const result = await submit(target);
    expect(result.status).toBe(201); expect(result.body.data.status).toBe('PENDING'); reviews[index] = result.body.data.id;
    const publicList = await api().get('/api/v1/reviews').query(target);
    expect(publicList.body.data.some((r: { id: string }) => r.id === reviews[index])).toBe(false);
    const detail = await api().get(`/api/v1/${index === 0 ? 'doctors' : index === 3 ? 'pharmacies' : 'organizations'}/${target.targetId}`);
    expect(detail.body.data.reviews.some((r: { id: string }) => r.id === reviews[index])).toBe(false);
    expect((await submit(target)).status).toBe(409);
    const eligibility = await api().get('/api/v1/reviews/eligibility').query(target).set('Authorization', patient.auth);
    expect(eligibility.body.data).toMatchObject({ eligible: false, review: { status: 'PENDING' } });
  });
  it('scopes mine to the current patient and disallows editing another review', async () => {
    const own = await api().get('/api/v1/reviews?mine=true').set('Authorization', patient.auth);
    expect(own.body.data.map((r: { id: string }) => r.id).sort()).toEqual([...reviews].sort());
    expect((await api().get('/api/v1/reviews?mine=true').set('Authorization', other.auth)).body.data).toEqual([]);
    expect((await api().get('/api/v1/reviews').query({ mine: 'true', patientId: patient.user.patientId }).set('Authorization', other.auth)).status).toBe(400);
    expect((await api().patch(`/api/v1/reviews/${reviews[0]}`).set('Authorization', other.auth).send({ rating: 1 })).status).toBe(404);
    expect((await api().post(`/api/v1/admin/reviews/${reviews[0]}/approve`).set('Authorization', patient.auth)).status).toBe(403);
    expect((await prisma.review.findUniqueOrThrow({ where: { id: reviews[0] } })).status).toBe('PENDING');
  });
  for (const index of [0, 1, 2, 3]) it(`recalculates approved-only ratings through moderation and reversal for target ${index}`, async () => {
    for (const decision of ['approve', 'approve', 'reject', 'reject', 'approve']) {
      const result = await api().post(`/api/v1/admin/reviews/${reviews[index]}/${decision}`).set('Authorization', admin.auth);
      expect(result.status).toBe(200); expect(result.body.data.status).toBe(decision === 'approve' ? 'APPROVED' : 'REJECTED');
      await assertTotals(targets[index]);
      const list = await api().get('/api/v1/reviews').query(targets[index]);
      expect(list.body.data.some((r: { id: string }) => r.id === reviews[index])).toBe(decision === 'approve');
    }
  });
  it('rejects pending reviews directly and handles missing reviews', async () => {
    await visit(targets[1], other.user.patientId);
    const result = await submit(targets[1], other.auth);
    expect(result.status).toBe(201);
    expect((await api().post(`/api/v1/admin/reviews/${result.body.data.id}/reject`).set('Authorization', admin.auth)).body.data.status).toBe('REJECTED');
    await assertTotals(targets[1]);
    expect((await api().post(`/api/v1/admin/reviews/${crypto.randomUUID()}/approve`).set('Authorization', admin.auth)).status).toBe(404);
  });
  it('serializes duplicate submissions and concurrent moderation for one target', async () => {
    await visit(targets[0], other.user.patientId);
    const created = await Promise.all([submit(targets[0], other.auth, 1), submit(targets[0], other.auth, 1)]);
    expect(created.map((r) => r.status).sort()).toEqual([201, 409]);
    const second = created.find((r) => r.status === 201)!.body.data.id;
    const results = await Promise.all([reviews[0], second].map((id) => api().post(`/api/v1/admin/reviews/${id}/approve`).set('Authorization', admin.auth)));
    expect(results.map((r) => r.status)).toEqual([200, 200]); await assertTotals(targets[0]);
  });
  it('validates filters and rejects mismatched target types', async () => {
    expect((await api().get('/api/v1/reviews').query({ targetId: doctorId })).status).toBe(400);
    expect((await submit({ targetType: 'PHARMACY', targetId: targets[1].targetId })).status).toBe(404);
    expect((await submit({ targetType: 'DOCTOR', targetId: crypto.randomUUID() })).status).toBe(404);
  });
});

describe('favorites', () => {
  it('requires a patient account', async () => {
    expect((await api().get('/api/v1/favorites')).status).toBe(401);
    expect((await api().post('/api/v1/favorites').set('Authorization', doctorUser.auth).send(targets[0])).status).toBe(403);
  });
  for (const index of [0, 1, 2, 3]) it(`adds, lists and removes target ${index} with owner isolation`, async () => {
    const result = await api().post('/api/v1/favorites').set('Authorization', patient.auth).send(targets[index]);
    expect(result.status).toBe(201);
    const id = result.body.data.id;
    const duplicate = await api().post('/api/v1/favorites').set('Authorization', patient.auth).send(targets[index]);
    expect(duplicate.body.data.id).toBe(id);
    const list = await api().get('/api/v1/favorites').set('Authorization', patient.auth);
    expect(list.body.data).toContainEqual(expect.objectContaining({ id, targetId: targets[index].targetId, href: expect.any(String), name: expect.any(String) }));
    expect((await api().get('/api/v1/favorites').set('Authorization', other.auth)).body.data).toEqual([]);
    expect((await api().delete(`/api/v1/favorites/${id}`).set('Authorization', other.auth)).status).toBe(404);
    expect((await api().patch(`/api/v1/favorites/${id}`).set('Authorization', other.auth).send({ patientId: other.user.patientId })).status).toBe(404);
    expect((await api().delete(`/api/v1/favorites/${id}`).set('Authorization', patient.auth)).status).toBe(200);
    expect((await api().delete(`/api/v1/favorites/${id}`).set('Authorization', patient.auth)).status).toBe(404);
  });
  it('rejects invalid providers and spoofed ownership', async () => {
    expect((await api().post('/api/v1/favorites').set('Authorization', patient.auth).send({ ...targets[0], patientId: other.user.patientId })).status).toBe(400);
    expect((await api().post('/api/v1/favorites').set('Authorization', patient.auth).send({ targetType: 'DOCTOR', targetId: crypto.randomUUID() })).status).toBe(404);
  });
});

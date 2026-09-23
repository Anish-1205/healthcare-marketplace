import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { api, signIn } from './helpers';

let patient: Awaited<ReturnType<typeof signIn>>;
let doctor: Awaited<ReturnType<typeof signIn>>;

beforeAll(async () => {
  patient = await signIn('patient@carebridge.demo');
  doctor = await signIn('doctor@carebridge.demo');
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('/notifications', () => {
  it('requires authentication', async () => {
    expect((await api().get('/api/v1/notifications')).status).toBe(401);
  });

  it('lists only the signed-in user’s notifications, newest first, paginated', async () => {
    const res = await api().get('/api/v1/notifications?pageSize=5').set('Authorization', patient.auth);
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 5 });
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((n: { userId: string }) => n.userId === patient.user.id)).toBe(true);
    const times = res.body.data.map((n: { createdAt: string }) => new Date(n.createdAt).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it('filters unread and reports the unread count', async () => {
    const count = await api().get('/api/v1/notifications/unread-count').set('Authorization', doctor.auth);
    const unread = await api().get('/api/v1/notifications?unread=true&pageSize=100').set('Authorization', doctor.auth);
    expect(unread.body.data.every((n: { isRead: boolean }) => !n.isRead)).toBe(true);
    expect(unread.body.meta.total).toBe(count.body.data.count);
  });

  it('marks a notification read, but never another user’s', async () => {
    const own = await prisma.notification.findFirstOrThrow({ where: { userId: doctor.user.id } });
    const foreign = await prisma.notification.findFirstOrThrow({ where: { userId: patient.user.id, isRead: false } });

    const blocked = await api().post(`/api/v1/notifications/${foreign.id}/read`).set('Authorization', doctor.auth);
    expect(blocked.status).toBe(404);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: foreign.id } })).isRead).toBe(false);

    const res = await api().post(`/api/v1/notifications/${own.id}/read`).set('Authorization', doctor.auth);
    expect(res.status).toBe(200);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: own.id } })).isRead).toBe(true);
  });

  it('validates the id', async () => {
    const res = await api().post('/api/v1/notifications/not-a-uuid/read').set('Authorization', doctor.auth);
    expect(res.status).toBe(400);
  });

  it('marks all as read for the current user only', async () => {
    const staff = await signIn('reception.sunrise@carebridge.demo');
    await prisma.notification.create({ data: { userId: staff.user.id, type: 'SYSTEM', title: 'Test', message: 'Unread' } });
    const patientUnreadBefore = await prisma.notification.count({ where: { userId: patient.user.id, isRead: false } });

    const res = await api().post('/api/v1/notifications/read-all').set('Authorization', staff.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.updated).toBeGreaterThanOrEqual(1);
    expect(await prisma.notification.count({ where: { userId: staff.user.id, isRead: false } })).toBe(0);
    expect(await prisma.notification.count({ where: { userId: patient.user.id, isRead: false } })).toBe(patientUnreadBefore);
  });
});

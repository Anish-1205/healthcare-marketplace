import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { TEST_DATABASE_URL } from './test-env';

const input = z.object({ action: z.enum(['visit', 'cleanup']), patientId: z.string().uuid(), targetId: z.string().uuid(), targetType: z.enum(['DOCTOR', 'CLINIC', 'HOSPITAL', 'PHARMACY']), doctorId: z.string().uuid() }).parse(JSON.parse(process.argv[2]));
const db = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
async function main() {
  const patient = await db.patient.findUniqueOrThrow({ where: { id: input.patientId }, include: { user: true } });
  if (!patient.user.email.startsWith('e2e.engagement.')) throw new Error('Fixture only accepts its own E2E patients.');
  const where = input.targetType === 'DOCTOR' ? { doctorId: input.targetId } : { organizationId: input.targetId };
  if (input.action === 'visit') {
    if (input.targetType === 'PHARMACY') await db.order.create({ data: { patientId: input.patientId, pharmacyId: input.targetId, orderNumber: `E2E-${crypto.randomUUID()}`, status: 'DELIVERED', subtotalMrp: 100, discountTotal: 0, deliveryFee: 0, platformFee: 0, totalAmount: 100, paymentMethod: 'CASH_ON_DELIVERY' } });
    else {
      const start = Date.now() - 365 * 86_400_000;
      await db.appointment.create({ data: { patientId: input.patientId, doctorId: input.doctorId, ...(input.targetType === 'DOCTOR' ? {} : { organizationId: input.targetId }), appointmentNumber: `E2E-${crypto.randomUUID()}`, status: 'COMPLETED', scheduledStart: new Date(start), scheduledEnd: new Date(start + 1_800_000), consultationType: 'IN_PERSON', fee: 500 } });
    }
  } else {
    await db.review.deleteMany({ where: { patientId: input.patientId } });
    await db.appointment.deleteMany({ where: { patientId: input.patientId } });
    await db.order.deleteMany({ where: { patientId: input.patientId } });
    await db.user.delete({ where: { id: patient.userId } });
    const totals = await db.review.aggregate({ where: { ...where, status: 'APPROVED' }, _avg: { rating: true }, _count: true });
    const data = { avgRating: totals._avg.rating ?? 0, reviewCount: totals._count };
    if (input.targetType === 'DOCTOR') await db.doctor.update({ where: { id: input.targetId }, data });
    else await db.organization.update({ where: { id: input.targetId }, data });
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());

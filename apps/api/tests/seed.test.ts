import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { seedDatabase } from '../src/demo/seed';
import { istParts } from '../src/utils/time';

const year = istParts(new Date()).year;

/**
 * These assertions describe a freshly seeded database — in particular the reserved golden
 * numbering (RX-…-00125 / ORD-…-0042 are left for the live demo). Other suites book appointments
 * and issue prescriptions against the same database, so re-seed first rather than depending on
 * which files happened to run before this one.
 */
beforeAll(async () => {
  await seedDatabase(prisma, { scenarioState: 'ready' });
}, 120_000);

afterAll(async () => {
  await prisma.$disconnect();
});

describe('demo seed (ready scenario)', () => {
  it('meets the demo data volume targets', async () => {
    const counts = {
      patients: await prisma.patient.count(),
      doctors: await prisma.doctor.count(),
      specialties: await prisma.specialty.count(),
      clinics: await prisma.organization.count({ where: { type: 'CLINIC', approvalStatus: 'APPROVED' } }),
      hospitals: await prisma.organization.count({ where: { type: 'HOSPITAL', approvalStatus: 'APPROVED' } }),
      pharmacies: await prisma.organization.count({ where: { type: 'PHARMACY', approvalStatus: 'APPROVED' } }),
      categories: await prisma.medicineCategory.count(),
      medicines: await prisma.medicine.count(),
      appointments: await prisma.appointment.count(),
      consultations: await prisma.consultation.count(),
      prescriptions: await prisma.prescription.count(),
      prescriptionItems: await prisma.prescriptionItem.count(),
      orders: await prisma.order.count(),
      orderItems: await prisma.orderItem.count(),
      reviews: await prisma.review.count(),
      notifications: await prisma.notification.count(),
      activityLogs: await prisma.activityLog.count(),
      payments: await prisma.payment.count(),
      deliveries: await prisma.delivery.count(),
      labTests: await prisma.labTest.count(),
      labBookings: await prisma.labBooking.count(),
    };
    const minimums: Record<keyof typeof counts, number> = {
      patients: 30, doctors: 18, specialties: 10, clinics: 4, hospitals: 2, pharmacies: 5, categories: 12,
      medicines: 50, appointments: 60, consultations: 30, prescriptions: 30, prescriptionItems: 70, orders: 40,
      orderItems: 80, reviews: 30, notifications: 40, activityLogs: 75, payments: 30, deliveries: 20,
      labTests: 15, labBookings: 10,
    };
    for (const [key, minimum] of Object.entries(minimums)) {
      expect(counts[key as keyof typeof counts], key).toBeGreaterThanOrEqual(minimum);
    }
  });

  it('leaves the golden numbers for the live demo', async () => {
    const rx = await prisma.prescription.findFirst({ orderBy: { prescriptionNumber: 'desc' } });
    const order = await prisma.order.findFirst({ orderBy: { orderNumber: 'desc' } });
    expect(rx?.prescriptionNumber).toBe(`RX-${year}-00124`);
    expect(order?.orderNumber).toBe(`ORD-${year}-0041`);
    expect((await prisma.sequenceCounter.findUnique({ where: { key: `RX-${year}` } }))?.value).toBe(124);
    expect((await prisma.sequenceCounter.findUnique({ where: { key: `ORD-${year}` } }))?.value).toBe(41);
  });

  it('has Rahul Verma, Dr. Maya Rao and City Care linked but no Maya appointment yet', async () => {
    const rahul = await prisma.patient.findFirstOrThrow({ where: { user: { email: 'patient@carebridge.demo' } }, include: { preferredPharmacy: true } });
    const maya = await prisma.doctor.findFirstOrThrow({ where: { user: { email: 'doctor@carebridge.demo' } }, include: { organizations: { include: { organization: true } } } });

    expect(rahul.preferredPharmacy?.name).toBe('City Care Pharmacy');
    expect(Number(maya.avgRating)).toBe(4.8);
    expect(maya.organizations.map((o) => o.organization.name)).toContain('Sunrise Family Clinic');
    expect(await prisma.appointment.count({ where: { patientId: rahul.id, doctorId: maya.id } })).toBe(0);
    expect(await prisma.appointment.count({ where: { patientId: rahul.id } })).toBeGreaterThanOrEqual(3);
    expect(await prisma.order.count({ where: { patientId: rahul.id } })).toBeGreaterThanOrEqual(2);
  });

  it('stocks every golden prescription medicine at City Care', async () => {
    const cityCare = await prisma.organization.findFirstOrThrow({ where: { name: 'City Care Pharmacy' } });
    for (const name of ['Demo Hydrocortisone Cream 1%', 'Demo Levocetirizine 5mg', 'Demo Moisturizing Cream 100g', 'Demo Calamine Lotion 100ml']) {
      const item = await prisma.pharmacyInventory.findFirst({ where: { pharmacyId: cityCare.id, medicine: { name } } });
      expect(item?.stockQuantity, name).toBeGreaterThan(0);
    }
  });

  it('keeps records consistent across portals', async () => {
    // Every order item belongs to an order whose pharmacy actually stocks that medicine.
    const orphanItems = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM order_items oi
      JOIN orders o ON o.id = oi."orderId"
      LEFT JOIN pharmacy_inventory pi ON pi."pharmacyId" = o."pharmacyId" AND pi."medicineId" = oi."medicineId"
      WHERE pi.id IS NULL`;
    expect(Number(orphanItems[0].n)).toBe(0);

    // Consultations only exist for appointments that reached the consultation stage.
    const badConsultations = await prisma.consultation.count({ where: { appointment: { status: { notIn: ['IN_CONSULTATION', 'COMPLETED'] } } } });
    expect(badConsultations).toBe(0);

    // No doctor is double-booked in an active slot.
    const doubleBooked = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM (
        SELECT "doctorId", "scheduledStart" FROM appointments WHERE status <> 'CANCELLED'
        GROUP BY 1, 2 HAVING COUNT(*) > 1) d`;
    expect(Number(doubleBooked[0].n)).toBe(0);

    // Pharmacy dashboard has work in every active column for City Care.
    const cityCare = await prisma.organization.findFirstOrThrow({ where: { name: 'City Care Pharmacy' } });
    const statuses = await prisma.order.groupBy({ by: ['status'], where: { pharmacyId: cityCare.id }, _count: true });
    const present = new Set(statuses.map((s) => s.status));
    for (const status of ['PENDING', 'PRESCRIPTION_REVIEW', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const) {
      expect(present.has(status), status).toBe(true);
    }
  });

  it('has pending registrations waiting for admin approval', async () => {
    expect(await prisma.organization.count({ where: { approvalStatus: 'PENDING_APPROVAL' } })).toBeGreaterThanOrEqual(3);
    expect(await prisma.doctor.count({ where: { approvalStatus: 'PENDING_APPROVAL' } })).toBeGreaterThanOrEqual(1);
  });
});

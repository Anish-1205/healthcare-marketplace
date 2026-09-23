import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { api, registerPatient, signIn } from './helpers';

let patient: Awaited<ReturnType<typeof registerPatient>>;
let staff: Awaited<ReturnType<typeof signIn>>;
let pharmacyId: string;
let medicineId: string;
const address = {
  recipient: 'Test Patient',
  phone: '9000000000',
  line1: '42 Demo Street',
  locality: 'Central District',
  city: 'Demo City',
  postalCode: '560001',
};
const base = { fulfillmentType: 'DELIVERY', paymentMethod: 'UPI', address };
beforeAll(async () => {
  patient = await registerPatient('orders');
  staff = await signIn('pharmacy@carebridge.demo');
  const member = await prisma.organizationStaff.findFirstOrThrow({ where: { userId: staff.user.id, organization: { type: 'PHARMACY' } } });
  pharmacyId = member.organizationId;
  const inventory = await prisma.pharmacyInventory.findFirstOrThrow({
    where: { pharmacyId, isActive: true, stockQuantity: { gt: 30 }, medicine: { requiresPrescription: false, isActive: true } },
  });
  medicineId = inventory.medicineId;
});
afterAll(() => prisma.$disconnect());
async function fill(quantity = 2, selectedMedicine = medicineId, selectedPharmacy = pharmacyId, user = patient) {
  await api().delete('/api/v1/cart').set('Authorization', user.auth);
  const res = await api()
    .post('/api/v1/cart/items')
    .set('Authorization', user.auth)
    .send({ pharmacyId: selectedPharmacy, medicineId: selectedMedicine, quantity });
  expect(res.status, JSON.stringify(res.body)).toBe(200);
}
async function place(extra = {}) {
  await fill();
  const res = await api()
    .post('/api/v1/orders')
    .set('Authorization', patient.auth)
    .send({ ...base, ...extra });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.data;
}
async function status(id: string, value: string, extra = {}) {
  return api()
    .post(`/api/v1/orders/${id}/status`)
    .set('Authorization', staff.auth)
    .send({ status: value, ...extra });
}

describe('checkout', () => {
  it('snapshots live totals/address, reserves stock, creates a simulated payment and clears the cart', async () => {
    await fill();
    const inventory = await prisma.pharmacyInventory.findUniqueOrThrow({ where: { pharmacyId_medicineId: { pharmacyId, medicineId } } });
    const context = await api().get('/api/v1/orders/checkout').set('Authorization', patient.auth);
    expect(context.status).toBe(200);
    const cart = context.body.data.cart;
    const deliveryFee =
      cart.pharmacy.freeDeliveryAbove !== null && cart.itemTotal >= cart.pharmacy.freeDeliveryAbove ? 0 : (cart.pharmacy.deliveryFee ?? 0);
    const res = await api()
      .post('/api/v1/orders')
      .set('Authorization', patient.auth)
      .send({ ...base, totalAmount: 1 });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const order = res.body.data;
    expect(order.totalAmount).toBeCloseTo(cart.itemTotal + deliveryFee + context.body.data.platformFee, 2);
    expect(order.subtotalMrp).toBe(cart.subtotalMrp);
    expect(order.discountTotal).toBe(cart.discountTotal);
    expect(order.address).toMatchObject(address);
    expect(order.payments[0]).toMatchObject({ amount: order.totalAmount, status: 'PAID', method: 'UPI' });
    expect(order.statusHistory.map((h: { toStatus: string }) => h.toStatus)).toEqual(['PENDING']);
    expect((await prisma.pharmacyInventory.findUniqueOrThrow({ where: { id: inventory.id } })).stockQuantity).toBe(
      inventory.stockQuantity - 2,
    );
    expect((await api().get('/api/v1/cart').set('Authorization', patient.auth)).body.data.items).toHaveLength(0);
  });
  it('rejects unavailable stock without creating an order or clearing the cart', async () => {
    await fill();
    const stock = await prisma.pharmacyInventory.findUniqueOrThrow({ where: { pharmacyId_medicineId: { pharmacyId, medicineId } } });
    const count = await prisma.order.count({ where: { patientId: patient.user.patientId } });
    try {
      await prisma.pharmacyInventory.update({ where: { id: stock.id }, data: { stockQuantity: 0 } });
      const res = await api().post('/api/v1/orders').set('Authorization', patient.auth).send(base);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('STOCK_UNAVAILABLE');
      expect(await prisma.order.count({ where: { patientId: patient.user.patientId } })).toBe(count);
      expect((await api().get('/api/v1/cart').set('Authorization', patient.auth)).body.data.items).toHaveLength(1);
    } finally {
      await prisma.pharmacyInventory.update({ where: { id: stock.id }, data: { stockQuantity: stock.stockQuantity } });
    }
  });
  it('serializes concurrent checkout so the same cart creates only one order', async () => {
    await fill();
    const results = await Promise.all([1, 2].map(() => api().post('/api/v1/orders').set('Authorization', patient.auth).send(base)));
    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
  });
  it('requires an address for delivery and rejects an address belonging to another patient', async () => {
    await fill();
    expect(
      (await api().post('/api/v1/orders').set('Authorization', patient.auth).send({ fulfillmentType: 'DELIVERY', paymentMethod: 'UPI' }))
        .status,
    ).toBe(400);
    const otherAddress = await prisma.address.findFirstOrThrow({ where: { userId: { not: patient.user.id } } });
    expect(
      (
        await api()
          .post('/api/v1/orders')
          .set('Authorization', patient.auth)
          .send({ ...base, addressId: otherAddress.id })
      ).status,
    ).toBe(404);
  });
  it('requires a matching issued prescription and prevents skipping its review', async () => {
    const inventory = await prisma.pharmacyInventory.findFirstOrThrow({
      where: { pharmacyId, isActive: true, stockQuantity: { gt: 3 }, medicine: { requiresPrescription: true, isActive: true } },
      include: { medicine: true },
    });
    await fill(1, inventory.medicineId);
    expect((await api().post('/api/v1/orders').set('Authorization', patient.auth).send(base)).body.error.code).toBe(
      'PRESCRIPTION_REQUIRED',
    );
    const doctor = await prisma.doctor.findFirstOrThrow();
    const rx = await prisma.prescription.create({
      data: {
        prescriptionNumber: `TEST-${randomUUID()}`,
        doctorId: doctor.id,
        patientId: patient.user.patientId,
        status: 'ISSUED',
        items: {
          create: {
            medicineId: inventory.medicineId,
            medicineName: inventory.medicine.name,
            dosage: 'Demo',
            frequency: 'Demo',
            duration: 'Demo',
            quantity: 1,
          },
        },
      },
    });
    const placed = await api()
      .post('/api/v1/orders')
      .set('Authorization', patient.auth)
      .send({ ...base, prescriptionId: rx.id });
    expect(placed.status, JSON.stringify(placed.body)).toBe(201);
    expect((await status(placed.body.data.id, 'CONFIRMED')).status).toBe(409);
    expect((await status(placed.body.data.id, 'PRESCRIPTION_REVIEW')).status).toBe(200);
    expect((await status(placed.body.data.id, 'CONFIRMED')).status).toBe(200);
  });
});
describe('pharmacy lifecycle and delivery', () => {
  it('walks the full delivery chain, settles cash, and stores both timelines', async () => {
    const order = await place({ paymentMethod: 'CASH_ON_DELIVERY' });
    expect(order.payments[0].status).toBe('PENDING');
    for (const value of ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP']) expect((await status(order.id, value)).status).toBe(200);
    const assigned = await api().post(`/api/v1/orders/${order.id}/delivery`).set('Authorization', staff.auth).send({});
    expect(assigned.status, JSON.stringify(assigned.body)).toBe(200);
    const deliveryId = assigned.body.data.delivery.id;
    expect(assigned.body.data.delivery.agentName).toBe('Arun Kumar');
    expect(
      (await api().post(`/api/v1/deliveries/${deliveryId}/status`).set('Authorization', staff.auth).send({ status: 'DELIVERED' })).status,
    ).toBe(409);
    for (const value of ['PICKED_UP', 'ON_THE_WAY', 'DELIVERED'])
      expect(
        (await api().post(`/api/v1/deliveries/${deliveryId}/status`).set('Authorization', staff.auth).send({ status: value })).status,
      ).toBe(200);
    const detail = (await api().get(`/api/v1/orders/${order.id}`).set('Authorization', patient.auth)).body.data;
    expect(detail.status).toBe('DELIVERED');
    expect(detail.payments[0].status).toBe('PAID');
    expect(detail.statusHistory.map((h: { toStatus: string }) => h.toStatus)).toEqual([
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'READY_FOR_PICKUP',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ]);
    expect(detail.delivery.statusHistory.map((h: { status: string }) => h.status)).toEqual([
      'ASSIGNED',
      'PICKED_UP',
      'ON_THE_WAY',
      'DELIVERED',
    ]);
    expect(detail.statusHistory.every((h: { createdAt: string }) => Number.isFinite(Date.parse(h.createdAt)))).toBe(true);
  });
  it('blocks skipped order statuses and premature delivery assignment', async () => {
    const order = await place();
    expect((await status(order.id, 'DELIVERED')).status).toBe(409);
    expect((await api().post(`/api/v1/orders/${order.id}/delivery`).set('Authorization', staff.auth).send({})).status).toBe(409);
    await status(order.id, 'CONFIRMED');
    await status(order.id, 'PREPARING');
    expect((await status(order.id, 'OUT_FOR_DELIVERY')).status).toBe(409);
    expect((await status(order.id, 'DELIVERED')).status).toBe(409);
  });
  it('completes pickup without a delivery fee or delivery agent', async () => {
    const order = await place({ fulfillmentType: 'PICKUP', paymentMethod: 'CASH_ON_DELIVERY' });
    expect(order.deliveryFee).toBe(0);
    expect(order.address).toBeNull();
    for (const value of ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP']) expect((await status(order.id, value)).status).toBe(200);
    expect((await api().post(`/api/v1/orders/${order.id}/delivery`).set('Authorization', staff.auth).send({})).status).toBe(409);
    const completed = await status(order.id, 'DELIVERED');
    expect(completed.status).toBe(200);
    expect(completed.body.data.payments[0].status).toBe('PAID');
    expect(completed.body.data.delivery).toBeNull();
  });
  it('reconciles reduced approved quantity/pricing and returns excess reserved stock', async () => {
    const order = await place();
    const item = order.items[0];
    const before = await prisma.pharmacyInventory.findUniqueOrThrow({ where: { pharmacyId_medicineId: { pharmacyId, medicineId } } });
    expect((await status(order.id, 'CONFIRMED', { items: [{ id: item.id, approvedQuantity: 3, unitPrice: item.unitPrice }] })).status).toBe(
      400,
    );
    const confirmed = await status(order.id, 'CONFIRMED', {
      items: [{ id: item.id, approvedQuantity: 1, unitPrice: 1 }],
      note: 'Demo quantity/price adjustment',
    });
    expect(confirmed.status, JSON.stringify(confirmed.body)).toBe(200);
    expect(confirmed.body.data.totalAmount).toBe(1 + order.deliveryFee + order.platformFee);
    expect(confirmed.body.data.payments[0].amount).toBe(confirmed.body.data.totalAmount);
    expect((await prisma.pharmacyInventory.findUniqueOrThrow({ where: { id: before.id } })).stockQuantity).toBe(before.stockQuantity + 1);
  });
  it('cancels before preparation, restores stock and refunds exactly once', async () => {
    const order = await place();
    const before = await prisma.pharmacyInventory.findUniqueOrThrow({ where: { pharmacyId_medicineId: { pharmacyId, medicineId } } });
    const cancelled = await api()
      .post(`/api/v1/orders/${order.id}/cancel`)
      .set('Authorization', patient.auth)
      .send({ note: 'Changed plans' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.payments[0].status).toBe('REFUNDED');
    expect((await api().post(`/api/v1/orders/${order.id}/cancel`).set('Authorization', patient.auth).send({})).status).toBe(409);
    expect((await prisma.pharmacyInventory.findUniqueOrThrow({ where: { id: before.id } })).stockQuantity).toBe(before.stockQuantity + 2);
  });
  it('allows omitting an unavailable line but refuses an empty approval', async () => {
    await fill();
    const extra = await prisma.pharmacyInventory.findFirstOrThrow({
      where: {
        pharmacyId,
        medicineId: { not: medicineId },
        isActive: true,
        stockQuantity: { gt: 3 },
        medicine: { requiresPrescription: false, isActive: true },
      },
    });
    expect(
      (
        await api()
          .post('/api/v1/cart/items')
          .set('Authorization', patient.auth)
          .send({ pharmacyId, medicineId: extra.medicineId, quantity: 1 })
      ).status,
    ).toBe(200);
    const placed = await api().post('/api/v1/orders').set('Authorization', patient.auth).send(base);
    expect(placed.status).toBe(201);
    const items = placed.body.data.items.map((i: { id: string; medicineId: string; unitPrice: number }) => ({
      id: i.id,
      approvedQuantity: i.medicineId === extra.medicineId ? 0 : 1,
      unitPrice: i.unitPrice,
    }));
    expect(
      (
        await status(placed.body.data.id, 'CONFIRMED', {
          items: items.map((i: { id: string; unitPrice: number }) => ({ ...i, approvedQuantity: 0 })),
        })
      ).status,
    ).toBe(400);
    expect((await status(placed.body.data.id, 'CONFIRMED', { items })).status).toBe(200);
    expect((await prisma.pharmacyInventory.findUniqueOrThrow({ where: { id: extra.id } })).stockQuantity).toBe(extra.stockQuantity);
  });
  it('blocks patient and pharmacy cancellation after preparation begins', async () => {
    const order = await place();
    await status(order.id, 'CONFIRMED');
    await status(order.id, 'PREPARING');
    expect((await api().post(`/api/v1/orders/${order.id}/cancel`).set('Authorization', patient.auth).send({})).status).toBe(409);
    expect((await status(order.id, 'CANCELLED')).status).toBe(409);
  });
  it('requires a rejection reason and refunds rejected orders', async () => {
    const order = await place();
    expect((await status(order.id, 'REJECTED')).status).toBe(400);
    const rejected = await status(order.id, 'REJECTED', { note: 'Unable to fulfill demo order' });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.payments[0].status).toBe('REFUNDED');
  });
});
describe('order access and simulated payments', () => {
  it('isolates patient reads, lists, cancellations, and payments', async () => {
    const order = await place();
    const other = await registerPatient('order-other');
    expect((await api().get(`/api/v1/orders/${order.id}`).set('Authorization', other.auth)).status).toBe(403);
    expect((await api().get('/api/v1/orders').set('Authorization', other.auth)).body.data).toEqual([]);
    expect((await api().post(`/api/v1/orders/${order.id}/cancel`).set('Authorization', other.auth).send({})).status).toBe(403);
    expect((await api().post('/api/v1/payments/simulate').set('Authorization', other.auth).send({ orderId: order.id })).status).toBe(403);
    expect((await status(order.id, 'CONFIRMED')).status).toBe(200);
    expect(
      (await api().post(`/api/v1/orders/${order.id}/status`).set('Authorization', patient.auth).send({ status: 'PREPARING' })).status,
    ).toBe(403);
  });
  it('prevents a pharmacy reading, processing or assigning delivery for another pharmacy', async () => {
    const other = await prisma.pharmacyInventory.findFirstOrThrow({
      where: {
        pharmacyId: { not: pharmacyId },
        isActive: true,
        stockQuantity: { gt: 5 },
        medicine: { requiresPrescription: false, isActive: true },
        pharmacy: { approvalStatus: 'APPROVED', isActive: true, pickupAvailable: true },
      },
    });
    await fill(1, other.medicineId, other.pharmacyId);
    const res = await api()
      .post('/api/v1/orders')
      .set('Authorization', patient.auth)
      .send({ fulfillmentType: 'PICKUP', paymentMethod: 'UPI' });
    expect(res.status).toBe(201);
    const id = res.body.data.id;
    expect((await api().get(`/api/v1/orders/${id}`).set('Authorization', staff.auth)).status).toBe(403);
    expect((await status(id, 'CONFIRMED')).status).toBe(403);
    expect((await api().post(`/api/v1/orders/${id}/delivery`).set('Authorization', staff.auth).send({})).status).toBe(403);
    const list = await api().get('/api/v1/orders').set('Authorization', staff.auth);
    expect(list.body.data.every((o: { pharmacy: { id: string } }) => o.pharmacy.id === pharmacyId)).toBe(true);
  });
  it('reuses a paid simulated payment without duplicate charges and blocks cash simulation', async () => {
    const order = await place();
    for (let i = 0; i < 2; i++)
      expect((await api().post('/api/v1/payments/simulate').set('Authorization', patient.auth).send({ orderId: order.id })).status).toBe(
        200,
      );
    expect(await prisma.payment.count({ where: { orderId: order.id } })).toBe(1);
    const cash = await place({ paymentMethod: 'CASH_ON_DELIVERY' });
    expect((await api().post('/api/v1/payments/simulate').set('Authorization', patient.auth).send({ orderId: cash.id })).status).toBe(409);
  });
});

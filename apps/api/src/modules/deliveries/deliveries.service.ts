import { prisma } from '../../config/prisma';
import type { AuthContext } from '../../types/auth';
import { conflict, notFound } from '../../utils/errors';
import { assertManage, getOrder, lockOrder, recordStatus } from '../orders/orders.service';

export async function assignDelivery(auth: AuthContext, orderId: string, etaMinutes: number) {
  await prisma.$transaction(async (tx) => {
    const row = await lockOrder(tx, orderId);
    assertManage(auth, row);
    if (row.fulfillmentType !== 'DELIVERY' || row.status !== 'READY_FOR_PICKUP' || row.delivery)
      throw conflict('DELIVERY_NOT_ASSIGNABLE', 'Delivery can be assigned once, when a delivery order is ready.');
    const estimatedArrivalAt = new Date(Date.now() + etaMinutes * 60_000);
    await tx.delivery.create({
      data: {
        orderId,
        agentName: 'Arun Kumar',
        agentPhone: '+91 90000 00000',
        vehicleType: 'Demo scooter',
        vehicleNumber: 'DEMO-0042',
        estimatedArrivalAt,
        statusHistory: { create: { status: 'ASSIGNED', note: 'Simulated delivery agent assigned' } },
      },
    });
    await tx.order.update({ where: { id: orderId }, data: { estimatedDeliveryAt: estimatedArrivalAt } });
  });
  return getOrder(auth, orderId);
}
export async function updateDelivery(auth: AuthContext, id: string, status: 'PICKED_UP' | 'ON_THE_WAY' | 'DELIVERED') {
  const delivery = await prisma.delivery.findUnique({ where: { id } });
  if (!delivery) throw notFound('Delivery');
  await prisma.$transaction(async (tx) => {
    const row = await lockOrder(tx, delivery.orderId);
    assertManage(auth, row);
    const current = row.delivery!;
    const next = { ASSIGNED: 'PICKED_UP', PICKED_UP: 'ON_THE_WAY', ON_THE_WAY: 'DELIVERED', DELIVERED: null };
    if (next[current.status] !== status || !['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(row.status))
      throw conflict('INVALID_DELIVERY_TRANSITION', 'Delivery must progress one step at a time.');
    await tx.delivery.update({
      where: { id },
      data: {
        status,
        ...(status === 'PICKED_UP' ? { pickedUpAt: new Date() } : {}),
        ...(status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
        statusHistory: { create: { status, note: 'Simulated delivery update' } },
      },
    });
    if (status === 'PICKED_UP') await recordStatus(tx, row, 'OUT_FOR_DELIVERY', auth, 'Collected by the delivery agent');
    if (status === 'DELIVERED') await recordStatus(tx, row, 'DELIVERED', auth, 'Simulated delivery completed');
  });
  return getOrder(auth, delivery.orderId);
}

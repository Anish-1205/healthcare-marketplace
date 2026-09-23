import { prisma } from '../../config/prisma';
import type { AuthContext } from '../../types/auth';
import { conflict, forbidden } from '../../utils/errors';
import { getOrder, lockOrder } from '../orders/orders.service';

/** Order checkout creates the payment; this endpoint never accepts a client amount or creates a duplicate. */
export async function simulatePayment(auth: AuthContext, orderId: string) {
  await prisma.$transaction(async (tx) => {
    const row = await lockOrder(tx, orderId);
    if (row.patientId !== auth.patientId) throw forbidden('This payment does not belong to you.');
    if (['CANCELLED', 'REJECTED'].includes(row.status)) throw conflict('PAYMENT_CLOSED', 'This order is closed.');
    const payment = row.payments[0];
    if (!payment || payment.method === 'CASH_ON_DELIVERY')
      throw conflict('PAYMENT_NOT_PAYABLE', 'Cash payments settle when the order is delivered or collected.');
    if (payment.status === 'REFUNDED') throw conflict('PAYMENT_CLOSED', 'This payment has been refunded.');
    if (payment.status !== 'PAID')
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID', amount: row.totalAmount, paidAt: new Date(), failureReason: null },
      });
  });
  return (await getOrder(auth, orderId)).payments[0];
}
export async function listPayments(auth: AuthContext, page: number, pageSize: number) {
  if (!auth.patientId && !auth.isPlatform) throw forbidden('Only patients and platform staff can list payments.');
  const where = auth.isPlatform ? {} : { patientId: auth.patientId! };
  const [data, total] = await prisma.$transaction([
    prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.payment.count({ where }),
  ]);
  return { data, total };
}

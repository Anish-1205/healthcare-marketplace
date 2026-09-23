import { Prisma } from '@prisma/client';
import { PERMISSIONS, type CheckoutContext, type OrderDetail, type OrderStatus } from '@carebridge/shared';
import { prisma, type Tx } from '../../config/prisma';
import type { AuthContext } from '../../types/auth';
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors';
import { nextNumber } from '../../utils/sequence';
import { toSkipTake } from '../../utils/http';
import { assertOrganizationAccess, canAccessOrganization, memberOrganizationIds } from '../../services/tenant.service';
import { notify, notifyUsers, organizationRecipientIds } from '../../services/notification.service';
import { logActivity } from '../../services/activity-log.service';
import { getCart } from '../cart/cart.service';
import type { CheckoutInput, StatusInput } from './orders.schemas';

export const orderInclude = {
  pharmacy: { select: { id: true, name: true, phone: true, addressLine1: true, city: true } },
  patient: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
  prescription: { include: { items: true } },
  items: { orderBy: { createdAt: 'asc' as const } },
  payments: { orderBy: { createdAt: 'desc' as const } },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  delivery: { include: { statusHistory: { orderBy: { createdAt: 'asc' as const } } } },
} satisfies Prisma.OrderInclude;
export type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
const cancellable: OrderStatus[] = ['PENDING', 'PRESCRIPTION_REVIEW', 'CONFIRMED'];
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function allowed(row: OrderRow): OrderStatus[] {
  switch (row.status) {
    case 'PENDING':
      return [
        row.prescriptionId || row.items.some((i) => i.requiresPrescription) ? 'PRESCRIPTION_REVIEW' : 'CONFIRMED',
        'REJECTED',
        'CANCELLED',
      ];
    case 'PRESCRIPTION_REVIEW':
      return ['CONFIRMED', 'REJECTED', 'CANCELLED'];
    case 'CONFIRMED':
      return ['PREPARING', 'CANCELLED'];
    case 'PREPARING':
      return ['READY_FOR_PICKUP'];
    case 'READY_FOR_PICKUP':
      return row.fulfillmentType === 'PICKUP' ? ['DELIVERED'] : [];
    default:
      return [];
  }
}
export function assertManage(auth: AuthContext, row: OrderRow) {
  if (!auth.permissions.has(PERMISSIONS.ORDER_MANAGE_PHARMACY)) throw forbidden('Only pharmacy staff can process orders.');
  assertOrganizationAccess(auth, row.pharmacyId, { types: ['PHARMACY'], approvedOnly: true });
}
function assertView(auth: AuthContext, row: OrderRow) {
  if (auth.isPlatform || auth.patientId === row.patientId) return;
  if (auth.permissions.has(PERMISSIONS.ORDER_READ_PHARMACY) && canAccessOrganization(auth, row.pharmacyId, { types: ['PHARMACY'] })) return;
  throw forbidden('You do not have access to this order.', 'ORDER_ACCESS_DENIED');
}
export async function findOrder(id: string, tx: Tx = prisma) {
  const row = await tx.order.findUnique({ where: { id }, include: orderInclude });
  if (!row) throw notFound('Order');
  return row;
}
export async function lockOrder(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM orders WHERE id = ${id}::uuid FOR UPDATE`;
  return findOrder(id, tx);
}
function detail(row: OrderRow, auth: AuthContext): OrderDetail {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    fulfillmentType: row.fulfillmentType,
    pharmacy: row.pharmacy,
    patient: { id: row.patientId, name: `${row.patient.user.firstName} ${row.patient.user.lastName}` },
    prescription: row.prescription
      ? {
          id: row.prescription.id,
          prescriptionNumber: row.prescription.prescriptionNumber,
          items: row.prescription.items.map((i) => ({
            medicineName: i.medicineName,
            dosage: i.dosage,
            frequency: i.frequency,
            duration: i.duration,
            quantity: i.quantity,
          })),
        }
      : null,
    address: row.deliveryLine1
      ? {
          recipient: row.deliveryRecipient!,
          phone: row.deliveryPhone!,
          line1: row.deliveryLine1,
          line2: row.deliveryLine2 ?? undefined,
          locality: row.deliveryLocality!,
          city: row.deliveryCity!,
          postalCode: row.deliveryPostalCode!,
        }
      : null,
    items: row.items.map((i) => ({
      id: i.id,
      medicineId: i.medicineId,
      medicineName: i.medicineName,
      packSize: i.packSize,
      quantity: i.quantity,
      approvedQuantity: i.approvedQuantity,
      requiresPrescription: i.requiresPrescription,
      unitMrp: Number(i.unitMrp),
      unitPrice: Number(i.unitPrice),
      lineTotal: Number(i.lineTotal),
    })),
    subtotalMrp: Number(row.subtotalMrp),
    discountTotal: Number(row.discountTotal),
    deliveryFee: Number(row.deliveryFee),
    platformFee: Number(row.platformFee),
    totalAmount: Number(row.totalAmount),
    paymentMethod: row.paymentMethod,
    payments: row.payments.map((p) => ({
      id: p.id,
      transactionRef: p.transactionRef,
      amount: Number(p.amount),
      method: p.method,
      status: p.status,
      paidAt: p.paidAt?.toISOString() ?? null,
      refundedAt: p.refundedAt?.toISOString() ?? null,
    })),
    patientNotes: row.patientNotes,
    pharmacyNotes: row.pharmacyNotes,
    rejectionReason: row.rejectionReason,
    placedAt: row.placedAt.toISOString(),
    canCancel:
      cancellable.includes(row.status) && (auth.patientId === row.patientId || auth.permissions.has(PERMISSIONS.ORDER_MANAGE_PHARMACY)),
    allowedStatuses: auth.permissions.has(PERMISSIONS.ORDER_MANAGE_PHARMACY) ? allowed(row) : [],
    statusHistory: row.statusHistory.map((h) => ({ id: h.id, toStatus: h.toStatus, note: h.note, createdAt: h.createdAt.toISOString() })),
    delivery: row.delivery
      ? {
          id: row.delivery.id,
          agentName: row.delivery.agentName,
          agentPhone: row.delivery.agentPhone,
          vehicleType: row.delivery.vehicleType,
          vehicleNumber: row.delivery.vehicleNumber,
          status: row.delivery.status,
          estimatedArrivalAt: row.delivery.estimatedArrivalAt?.toISOString() ?? null,
          statusHistory: row.delivery.statusHistory.map((h) => ({
            id: h.id,
            status: h.status,
            note: h.note,
            createdAt: h.createdAt.toISOString(),
          })),
        }
      : null,
  };
}
export async function getOrder(auth: AuthContext, id: string) {
  const row = await findOrder(id);
  assertView(auth, row);
  return detail(row, auth);
}
export async function listOrders(auth: AuthContext, query: { page: number; pageSize: number; status?: OrderStatus }) {
  const scope: Prisma.OrderWhereInput = auth.isPlatform
    ? {}
    : auth.patientId
      ? { patientId: auth.patientId }
      : auth.permissions.has(PERMISSIONS.ORDER_READ_PHARMACY)
        ? { pharmacyId: { in: memberOrganizationIds(auth, ['PHARMACY']) } }
        : { id: { in: [] } };
  const where = { ...scope, ...(query.status ? { status: query.status } : {}) };
  const [rows, total] = await prisma.$transaction([
    prisma.order.findMany({ where, include: orderInclude, orderBy: { placedAt: 'desc' }, ...toSkipTake(query) }),
    prisma.order.count({ where }),
  ]);
  return { data: rows.map((r) => detail(r, auth)), total };
}
async function platformFee(tx: Tx = prisma) {
  const setting = await tx.platformSetting.findUnique({ where: { key: 'orders.platformFee' } });
  const value = Number(setting?.value ?? 10);
  return Number.isFinite(value) && value >= 0 ? money(value) : 10;
}
export async function checkoutContext(auth: AuthContext): Promise<CheckoutContext> {
  return {
    cart: await getCart(auth),
    platformFee: await platformFee(),
    addresses: (await prisma.address.findMany({ where: { userId: auth.userId }, orderBy: { isDefault: 'desc' } })).map((a) => ({
      ...a,
      line2: a.line2 ?? undefined,
    })),
  };
}

export async function checkout(auth: AuthContext, input: CheckoutInput) {
  if (!auth.patientId) throw forbidden('A patient profile is required.');
  const patientId = auth.patientId;
  const id = await prisma.$transaction(async (tx) => {
    // Serializes double-clicks: the second request sees an empty cart after the first commits.
    await tx.$queryRaw`SELECT id FROM carts WHERE "patientId" = ${patientId}::uuid FOR UPDATE`;
    const cart = await tx.cart.findUnique({ where: { patientId }, include: { items: { include: { medicine: true } }, pharmacy: true } });
    if (!cart?.items.length || !cart.pharmacy) throw badRequest('EMPTY_CART', 'Your cart is empty.');
    const pharmacy = cart.pharmacy;
    if (!pharmacy.isActive || pharmacy.approvalStatus !== 'APPROVED')
      throw conflict('PHARMACY_UNAVAILABLE', 'This pharmacy is unavailable.');
    if (input.fulfillmentType === 'DELIVERY' ? !pharmacy.deliveryAvailable : !pharmacy.pickupAvailable)
      throw badRequest('FULFILLMENT_UNAVAILABLE', 'This pharmacy does not offer that fulfillment method.');
    let address = input.address;
    if (input.fulfillmentType === 'DELIVERY' && input.addressId) {
      const saved = await tx.address.findFirst({ where: { id: input.addressId, userId: auth.userId } });
      if (!saved) throw notFound('Address');
      address = { ...saved, line2: saved.line2 ?? undefined };
    }
    const prescriptionId = input.prescriptionId ?? cart.prescriptionId;
    const rx = prescriptionId ? await tx.prescription.findUnique({ where: { id: prescriptionId }, include: { items: true } }) : null;
    if (prescriptionId && (!rx || rx.patientId !== patientId || rx.status !== 'ISSUED'))
      throw badRequest('INVALID_PRESCRIPTION', 'Choose an issued prescription belonging to you.');
    if (rx && !pharmacy.acceptsPrescriptions) throw badRequest('PRESCRIPTION_UNAVAILABLE', 'This pharmacy does not accept prescriptions.');
    if (cart.items.some((i) => i.medicine.requiresPrescription && !rx?.items.some((r) => r.medicineId === i.medicineId)))
      throw badRequest('PRESCRIPTION_REQUIRED', 'Attach an issued prescription covering the prescription medicines in your cart.');
    const items = [];
    for (const item of [...cart.items].sort((a, b) => a.medicineId.localeCompare(b.medicineId))) {
      const inventory = await tx.pharmacyInventory.findUnique({
        where: { pharmacyId_medicineId: { pharmacyId: pharmacy.id, medicineId: item.medicineId } },
      });
      if (!item.medicine.isActive || !inventory?.isActive) throw conflict('STOCK_UNAVAILABLE', `${item.medicine.name} is unavailable.`);
      const reserved = await tx.pharmacyInventory.updateMany({
        where: { id: inventory.id, isActive: true, stockQuantity: { gte: item.quantity } },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (!reserved.count) throw conflict('STOCK_UNAVAILABLE', `Not enough stock for ${item.medicine.name}.`);
      items.push({
        medicineId: item.medicineId,
        medicineName: item.medicine.name,
        packSize: item.medicine.packSize,
        requiresPrescription: item.medicine.requiresPrescription,
        quantity: item.quantity,
        unitMrp: inventory.mrp,
        unitPrice: inventory.sellingPrice,
        lineTotal: money(Number(inventory.sellingPrice) * item.quantity),
      });
    }
    const subtotalMrp = money(items.reduce((s, i) => s + Number(i.unitMrp) * i.quantity, 0));
    const itemTotal = money(items.reduce((s, i) => s + i.lineTotal, 0));
    const deliveryFee =
      input.fulfillmentType === 'PICKUP' || (pharmacy.freeDeliveryAbove !== null && itemTotal >= Number(pharmacy.freeDeliveryAbove))
        ? 0
        : Number(pharmacy.deliveryFee ?? 0);
    const fee = await platformFee(tx);
    const totalAmount = money(itemTotal + deliveryFee + fee);
    const row = await tx.order.create({
      data: {
        orderNumber: await nextNumber(tx, 'order'),
        patientId,
        pharmacyId: pharmacy.id,
        prescriptionId,
        fulfillmentType: input.fulfillmentType,
        paymentMethod: input.paymentMethod,
        patientNotes: input.patientNotes,
        ...(input.fulfillmentType === 'DELIVERY' && address
          ? {
              addressId: input.addressId,
              deliveryRecipient: address.recipient,
              deliveryPhone: address.phone,
              deliveryLine1: address.line1,
              deliveryLine2: address.line2,
              deliveryLocality: address.locality,
              deliveryCity: address.city,
              deliveryPostalCode: address.postalCode,
            }
          : {}),
        subtotalMrp,
        discountTotal: money(subtotalMrp - itemTotal),
        deliveryFee,
        platformFee: fee,
        totalAmount,
        items: { create: items },
        statusHistory: { create: { toStatus: 'PENDING', changedById: auth.userId, note: 'Order placed. Payment is simulated.' } },
        payments: {
          create: {
            patientId,
            purpose: 'ORDER',
            transactionRef: await nextNumber(tx, 'transaction'),
            amount: totalAmount,
            method: input.paymentMethod,
            status: input.paymentMethod === 'CASH_ON_DELIVERY' ? 'PENDING' : 'PAID',
            paidAt: input.paymentMethod === 'CASH_ON_DELIVERY' ? null : new Date(),
            methodDetail: 'Demo payment — no money charged',
          },
        },
      },
    });
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({ where: { id: cart.id }, data: { pharmacyId: null, prescriptionId: null } });
    await notify(
      {
        userId: auth.userId,
        type: 'ORDER_PLACED',
        title: 'Order placed',
        message: `${row.orderNumber} is awaiting pharmacy confirmation.`,
        link: `/orders/${row.id}`,
      },
      tx,
    );
    await notifyUsers(
      await organizationRecipientIds(pharmacy.id, {}, tx),
      { type: 'ORDER_PLACED', title: 'New medicine order', message: row.orderNumber, link: `/pharmacy/orders/${row.id}` },
      tx,
    );
    await logActivity(
      {
        action: 'order.created',
        entityType: 'order',
        entityId: row.id,
        actorUserId: auth.userId,
        organizationId: pharmacy.id,
        description: `Placed ${row.orderNumber}`,
      },
      tx,
    );
    return row.id;
  });
  return getOrder(auth, id);
}

export async function recordStatus(tx: Tx, row: OrderRow, status: OrderStatus, auth: AuthContext, note?: string) {
  await tx.order.update({
    where: { id: row.id },
    data: {
      status,
      ...(status === 'CONFIRMED' ? { confirmedAt: new Date() } : {}),
      ...(status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
      ...(status === 'CANCELLED' || status === 'REJECTED' ? { cancelledAt: new Date() } : {}),
      statusHistory: { create: { fromStatus: row.status, toStatus: status, changedById: auth.userId, note } },
    },
  });
  if (status === 'DELIVERED')
    await tx.payment.updateMany({
      where: { orderId: row.id, status: 'PENDING', method: 'CASH_ON_DELIVERY' },
      data: { status: 'PAID', paidAt: new Date() },
    });
  await notify(
    {
      userId: row.patient.user.id,
      type:
        status === 'DELIVERED'
          ? 'ORDER_DELIVERED'
          : status === 'OUT_FOR_DELIVERY'
            ? 'ORDER_DISPATCHED'
            : status === 'CONFIRMED'
              ? 'ORDER_ACCEPTED'
              : status === 'REJECTED'
                ? 'ORDER_REJECTED'
                : 'SYSTEM',
      title: 'Order update',
      message: `${row.orderNumber}: ${status.toLowerCase().replaceAll('_', ' ')}`,
      link: `/orders/${row.id}`,
    },
    tx,
  );
  await logActivity(
    {
      action:
        status === 'DELIVERED'
          ? 'order.delivered'
          : status === 'OUT_FOR_DELIVERY'
            ? 'order.dispatched'
            : status === 'REJECTED'
              ? 'order.rejected'
              : 'order.status_updated',
      entityType: 'order',
      entityId: row.id,
      actorUserId: auth.userId,
      organizationId: row.pharmacyId,
      description: `${row.orderNumber}: ${status}`,
    },
    tx,
  );
}
async function releaseStock(tx: Tx, row: OrderRow) {
  for (const i of row.items)
    if (i.medicineId)
      await tx.pharmacyInventory.updateMany({
        where: { pharmacyId: row.pharmacyId, medicineId: i.medicineId },
        data: { stockQuantity: { increment: i.approvedQuantity ?? i.quantity } },
      });
  await tx.payment.updateMany({ where: { orderId: row.id, status: 'PAID' }, data: { status: 'REFUNDED', refundedAt: new Date() } });
  await tx.payment.updateMany({
    where: { orderId: row.id, status: 'PENDING' },
    data: { status: 'FAILED', failureReason: 'Order cancelled or rejected' },
  });
}
export async function changeStatus(auth: AuthContext, id: string, input: StatusInput) {
  await prisma.$transaction(async (tx) => {
    const row = await lockOrder(tx, id);
    assertManage(auth, row);
    if (!allowed(row).includes(input.status)) throw conflict('INVALID_ORDER_TRANSITION', 'This order cannot move to that status.');
    if (input.items && input.status !== 'CONFIRMED') throw badRequest('INVALID_REVIEW', 'Edit quantities and prices only when confirming.');
    if (input.status === 'REJECTED' && !input.note) throw badRequest('REASON_REQUIRED', 'Give a reason for rejecting the order.');
    if (input.status === 'CONFIRMED') {
      const edits = input.items ?? row.items.map((i) => ({ id: i.id, approvedQuantity: i.quantity, unitPrice: Number(i.unitPrice) }));
      if (edits.length !== row.items.length || new Set(edits.map((i) => i.id)).size !== row.items.length)
        throw badRequest('INVALID_REVIEW', 'Review every order item exactly once.');
      if (!edits.some((i) => i.approvedQuantity > 0))
        throw badRequest('INVALID_REVIEW', 'Reject the order if no medicines can be supplied.');
      let subtotal = 0,
        itemTotal = 0;
      for (const edit of edits) {
        const original = row.items.find((i) => i.id === edit.id);
        if (!original || edit.approvedQuantity > original.quantity || edit.unitPrice > Number(original.unitPrice))
          throw badRequest('INVALID_REVIEW', 'Approved quantities and prices cannot exceed what the patient agreed to.');
        if (original.medicineId && edit.approvedQuantity < original.quantity)
          await tx.pharmacyInventory.updateMany({
            where: { pharmacyId: row.pharmacyId, medicineId: original.medicineId },
            data: { stockQuantity: { increment: original.quantity - edit.approvedQuantity } },
          });
        const lineTotal = money(edit.approvedQuantity * edit.unitPrice);
        await tx.orderItem.update({
          where: { id: edit.id },
          data: { approvedQuantity: edit.approvedQuantity, unitPrice: edit.unitPrice, lineTotal },
        });
        subtotal += Number(original.unitMrp) * edit.approvedQuantity;
        itemTotal += lineTotal;
      }
      const total = money(itemTotal + Number(row.deliveryFee) + Number(row.platformFee));
      await tx.order.update({
        where: { id },
        data: { subtotalMrp: money(subtotal), discountTotal: money(subtotal - itemTotal), totalAmount: total, pharmacyNotes: input.note },
      });
      // Simulated payments are reconciled to the approved amount; no real charge/refund occurs.
      await tx.payment.updateMany({
        where: { orderId: id, status: { in: ['PAID', 'PENDING'] } },
        data: { amount: total, methodDetail: 'Demo payment reconciled to pharmacy-approved total' },
      });
    }
    if (input.status === 'CANCELLED' || input.status === 'REJECTED') {
      await releaseStock(tx, row);
      await tx.order.update({ where: { id }, data: { rejectionReason: input.note } });
    }
    await recordStatus(tx, row, input.status, auth, input.note);
  });
  return getOrder(auth, id);
}
export async function cancelOrder(auth: AuthContext, id: string, note?: string) {
  await prisma.$transaction(async (tx) => {
    const row = await lockOrder(tx, id);
    if (auth.patientId !== row.patientId) throw forbidden('Only the patient can cancel through this endpoint.');
    if (!cancellable.includes(row.status)) throw conflict('ORDER_NOT_CANCELLABLE', 'Orders cannot be cancelled after preparation begins.');
    await releaseStock(tx, row);
    await recordStatus(tx, row, 'CANCELLED', auth, note);
  });
  return getOrder(auth, id);
}

import type { Prisma } from '@prisma/client';
import type { CartDetail, CartFromPrescriptionResult, CartItemDetail, CartPharmacyRef } from '@carebridge/shared';
import { prisma } from '../../config/prisma';
import type { AuthContext } from '../../types/auth';
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors';
import type { AddCartItemInput, CartFromPrescriptionInput, UpdateCartItemInput } from './cart.schemas';

/**
 * The patient's cart. One row per patient (`carts.patientId` is unique), bound to a single
 * pharmacy — adding an item from a different pharmacy either needs `replace: true` or is
 * refused, since prices, stock and prescription acceptance are all pharmacy-specific.
 *
 * Prices are read live from `pharmacy_inventory` on every fetch rather than snapshotted onto the
 * cart item, so the cart always reflects the pharmacy's current price and stock.
 */

function requirePatientId(auth: AuthContext): string {
  if (!auth.patientId) throw forbidden('Only patients have a cart.', 'PATIENT_PROFILE_REQUIRED');
  return auth.patientId;
}

const cartInclude = {
  pharmacy: {
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      locality: true,
      deliveryAvailable: true,
      pickupAvailable: true,
      deliveryFee: true,
      freeDeliveryAbove: true,
      deliveryEtaMinMinutes: true,
      deliveryEtaMaxMinutes: true,
      acceptsPrescriptions: true,
    },
  },
  prescription: { select: { id: true, prescriptionNumber: true } },
  items: {
    include: { medicine: { select: { id: true, slug: true, name: true, imageUrl: true, packSize: true, requiresPrescription: true, mrp: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.CartInclude;

type CartRow = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

function mapPharmacy(pharmacy: CartRow['pharmacy']): CartPharmacyRef | null {
  if (!pharmacy) return null;
  return {
    id: pharmacy.id,
    slug: pharmacy.slug,
    name: pharmacy.name,
    logoUrl: pharmacy.logoUrl,
    locality: pharmacy.locality,
    deliveryAvailable: pharmacy.deliveryAvailable,
    pickupAvailable: pharmacy.pickupAvailable,
    deliveryFee: pharmacy.deliveryFee ? Number(pharmacy.deliveryFee) : null,
    freeDeliveryAbove: pharmacy.freeDeliveryAbove ? Number(pharmacy.freeDeliveryAbove) : null,
    deliveryEtaMinMinutes: pharmacy.deliveryEtaMinMinutes,
    deliveryEtaMaxMinutes: pharmacy.deliveryEtaMaxMinutes,
    acceptsPrescriptions: pharmacy.acceptsPrescriptions,
  };
}

async function toDetail(cart: CartRow | null): Promise<CartDetail> {
  if (!cart || !cart.items.length) {
    return {
      id: cart?.id ?? null,
      pharmacy: mapPharmacy(cart?.pharmacy ?? null),
      prescriptionId: cart?.prescriptionId ?? null,
      prescriptionNumber: cart?.prescription?.prescriptionNumber ?? null,
      items: [],
      itemCount: 0,
      subtotalMrp: 0,
      discountTotal: 0,
      itemTotal: 0,
      hasUnavailableItems: false,
      updatedAt: cart?.updatedAt.toISOString() ?? null,
    };
  }

  // Live prices/stock for this cart's pharmacy, looked up fresh rather than trusting a snapshot.
  const inventoryRows = cart.pharmacyId
    ? await prisma.pharmacyInventory.findMany({ where: { pharmacyId: cart.pharmacyId, medicineId: { in: cart.items.map((item) => item.medicineId) } } })
    : [];
  const inventoryByMedicine = new Map(inventoryRows.map((row) => [row.medicineId, row]));

  let subtotalMrp = 0;
  let itemTotal = 0;
  const items: CartItemDetail[] = cart.items.map((item) => {
    const inventory = inventoryByMedicine.get(item.medicineId);
    const availableStock = inventory?.stockQuantity ?? 0;
    const isAvailable = Boolean(inventory?.isActive) && availableStock > 0;
    const unitMrp = inventory ? Number(inventory.mrp) : Number(item.medicine.mrp);
    const unitPrice = inventory ? Number(inventory.sellingPrice) : unitMrp;
    const lineTotal = unitPrice * item.quantity;
    subtotalMrp += unitMrp * item.quantity;
    itemTotal += lineTotal;

    return {
      medicineId: item.medicineId,
      slug: item.medicine.slug,
      name: item.medicine.name,
      imageUrl: item.medicine.imageUrl,
      packSize: item.medicine.packSize,
      requiresPrescription: item.medicine.requiresPrescription,
      quantity: item.quantity,
      unitMrp,
      unitPrice,
      lineTotal,
      availableStock,
      isAvailable,
    };
  });

  return {
    id: cart.id,
    pharmacy: mapPharmacy(cart.pharmacy),
    prescriptionId: cart.prescriptionId,
    prescriptionNumber: cart.prescription?.prescriptionNumber ?? null,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalMrp,
    discountTotal: Math.max(0, subtotalMrp - itemTotal),
    itemTotal,
    hasUnavailableItems: items.some((item) => !item.isAvailable || item.quantity > item.availableStock),
    updatedAt: cart.updatedAt.toISOString(),
  };
}

export async function getCart(auth: AuthContext): Promise<CartDetail> {
  const patientId = requirePatientId(auth);
  const cart = await prisma.cart.findUnique({ where: { patientId }, include: cartInclude });
  return toDetail(cart);
}

export async function addCartItem(auth: AuthContext, input: AddCartItemInput): Promise<CartDetail> {
  const patientId = requirePatientId(auth);

  const pharmacy = await prisma.organization.findFirst({
    where: { id: input.pharmacyId, type: 'PHARMACY', approvalStatus: 'APPROVED', isActive: true },
    select: { id: true },
  });
  if (!pharmacy) throw notFound('Pharmacy');

  const inventory = await prisma.pharmacyInventory.findUnique({
    where: { pharmacyId_medicineId: { pharmacyId: input.pharmacyId, medicineId: input.medicineId } },
  });
  if (!inventory || !inventory.isActive || inventory.stockQuantity <= 0) {
    throw badRequest('MEDICINE_UNAVAILABLE', 'This medicine is not currently available at that pharmacy.');
  }

  const existingCart = await prisma.cart.findUnique({
    where: { patientId },
    include: { _count: { select: { items: true } }, pharmacy: { select: { name: true } } },
  });
  const switchingPharmacy = Boolean(existingCart?.pharmacyId && existingCart.pharmacyId !== input.pharmacyId && existingCart._count.items > 0);
  if (switchingPharmacy && !input.replace) {
    throw conflict('PHARMACY_MISMATCH', `Your cart has items from ${existingCart!.pharmacy!.name}. Adding this item will replace them.`);
  }

  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({
      where: { patientId },
      create: { patientId, pharmacyId: input.pharmacyId },
      update: { pharmacyId: input.pharmacyId, ...(existingCart?.pharmacyId !== input.pharmacyId ? { prescriptionId: null } : {}) },
    });
    if (switchingPharmacy) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    await tx.cartItem.upsert({
      where: { cartId_medicineId: { cartId: cart.id, medicineId: input.medicineId } },
      create: { cartId: cart.id, medicineId: input.medicineId, quantity: input.quantity },
      update: { quantity: { increment: input.quantity } },
    });
  });

  return getCart(auth);
}

export async function updateCartItem(auth: AuthContext, medicineId: string, input: UpdateCartItemInput): Promise<CartDetail> {
  const patientId = requirePatientId(auth);
  const cart = await prisma.cart.findUnique({ where: { patientId } });
  if (!cart) throw notFound('Cart item');

  const result = await prisma.cartItem.updateMany({ where: { cartId: cart.id, medicineId }, data: { quantity: input.quantity } });
  if (result.count === 0) throw notFound('Cart item');

  return getCart(auth);
}

export async function removeCartItem(auth: AuthContext, medicineId: string): Promise<CartDetail> {
  const patientId = requirePatientId(auth);
  const cart = await prisma.cart.findUnique({ where: { patientId } });
  if (!cart) throw notFound('Cart item');

  await prisma.$transaction(async (tx) => {
    const result = await tx.cartItem.deleteMany({ where: { cartId: cart.id, medicineId } });
    if (result.count === 0) throw notFound('Cart item');
    const remaining = await tx.cartItem.count({ where: { cartId: cart.id } });
    // Nothing left to bind to a pharmacy — reopen the cart to any pharmacy for the next item.
    if (remaining === 0) await tx.cart.update({ where: { id: cart.id }, data: { pharmacyId: null, prescriptionId: null } });
  });

  return getCart(auth);
}

export async function clearCart(auth: AuthContext): Promise<CartDetail> {
  const patientId = requirePatientId(auth);
  const cart = await prisma.cart.findUnique({ where: { patientId } });
  if (cart) {
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
      prisma.cart.update({ where: { id: cart.id }, data: { pharmacyId: null, prescriptionId: null } }),
    ]);
  }
  return getCart(auth);
}

/**
 * The "Order Medicines" flow: replaces the cart wholesale with this pharmacy's stock of the
 * prescription's medicines. Hand-typed lines (no catalogue medicine) and anything out of stock
 * are reported back rather than silently dropped, so the patient knows what didn't make it in.
 */
export async function buildCartFromPrescription(auth: AuthContext, input: CartFromPrescriptionInput): Promise<CartFromPrescriptionResult> {
  const patientId = requirePatientId(auth);

  const prescription = await prisma.prescription.findUnique({ where: { id: input.prescriptionId }, include: { items: true } });
  if (!prescription) throw notFound('Prescription');
  if (prescription.patientId !== patientId) throw forbidden('This prescription is not yours.', 'PRESCRIPTION_ACCESS_DENIED');
  if (prescription.status !== 'ISSUED') throw conflict('PRESCRIPTION_NOT_ISSUED', 'Only issued prescriptions can be ordered.');

  const pharmacy = await prisma.organization.findFirst({
    where: { id: input.pharmacyId, type: 'PHARMACY', approvalStatus: 'APPROVED', isActive: true, acceptsPrescriptions: true },
    select: { id: true },
  });
  if (!pharmacy) throw notFound('Pharmacy');

  const medicineIds = [...new Set(prescription.items.map((item) => item.medicineId).filter((id): id is string => Boolean(id)))];
  const inventoryRows = medicineIds.length
    ? await prisma.pharmacyInventory.findMany({ where: { pharmacyId: input.pharmacyId, medicineId: { in: medicineIds } } })
    : [];
  const inventoryByMedicine = new Map(inventoryRows.map((row) => [row.medicineId, row]));

  const unmatchedItems: CartFromPrescriptionResult['unmatchedItems'] = [];
  const quantityByMedicine = new Map<string, number>();

  for (const item of prescription.items) {
    if (!item.medicineId) {
      unmatchedItems.push({ medicineName: item.medicineName, reason: 'NO_CATALOG_MATCH' });
      continue;
    }
    const inventory = inventoryByMedicine.get(item.medicineId);
    if (!inventory || !inventory.isActive) {
      unmatchedItems.push({ medicineName: item.medicineName, reason: 'NOT_STOCKED' });
      continue;
    }
    if (inventory.stockQuantity <= 0) {
      unmatchedItems.push({ medicineName: item.medicineName, reason: 'OUT_OF_STOCK' });
      continue;
    }
    // Cap to what's on the shelf — the doctor's prescribed quantity may exceed current stock.
    const quantity = Math.min((quantityByMedicine.get(item.medicineId) ?? 0) + item.quantity, inventory.stockQuantity);
    quantityByMedicine.set(item.medicineId, quantity);
  }

  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({
      where: { patientId },
      create: { patientId, pharmacyId: input.pharmacyId, prescriptionId: prescription.id },
      update: { pharmacyId: input.pharmacyId, prescriptionId: prescription.id },
    });
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    if (quantityByMedicine.size) {
      await tx.cartItem.createMany({
        data: [...quantityByMedicine.entries()].map(([medicineId, quantity]) => ({ cartId: cart.id, medicineId, quantity })),
      });
    }
  });

  return { cart: await getCart(auth), unmatchedItems };
}

import type { Prisma } from '@prisma/client';
import type { MedicineDetail, MedicineSummary } from '@carebridge/shared';
import { prisma } from '../../config/prisma';
import { notFound } from '../../utils/errors';
import { toSkipTake } from '../../utils/http';
import type { ListMedicinesQuery } from './medicines.schemas';

const inStockActivePharmacy = {
  isActive: true,
  pharmacy: { approvalStatus: 'APPROVED' as const, isActive: true },
} satisfies Prisma.PharmacyInventoryWhereInput;

const summaryInclude = {
  category: { select: { id: true, name: true, slug: true } },
  inventory: { where: inStockActivePharmacy, select: { sellingPrice: true, stockQuantity: true } },
} satisfies Prisma.MedicineInclude;

type MedicineRow = Prisma.MedicineGetPayload<{ include: typeof summaryInclude }>;

function toSummary(medicine: MedicineRow): MedicineSummary {
  const inStock = medicine.inventory.filter((item) => item.stockQuantity > 0);
  const bestPrice = inStock.length ? Math.min(...inStock.map((item) => Number(item.sellingPrice))) : null;
  const mrp = Number(medicine.mrp);
  return {
    id: medicine.id,
    slug: medicine.slug,
    name: medicine.name,
    genericName: medicine.genericName,
    brand: medicine.brand,
    manufacturer: medicine.manufacturer,
    category: medicine.category,
    strength: medicine.strength,
    dosageForm: medicine.dosageForm,
    packSize: medicine.packSize,
    mrp,
    requiresPrescription: medicine.requiresPrescription,
    imageUrl: medicine.imageUrl,
    bestPrice,
    discountPercent: bestPrice !== null && mrp > 0 ? Math.round(((mrp - bestPrice) / mrp) * 100) : null,
    inStockPharmacyCount: inStock.length,
  };
}

export async function listMedicines(query: ListMedicinesQuery) {
  const where: Prisma.MedicineWhereInput = {
    isActive: true,
    ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { genericName: { contains: query.q, mode: 'insensitive' } }, { brand: { contains: query.q, mode: 'insensitive' } }] } : {}),
    ...(query.category ? { category: { slug: query.category } } : {}),
    ...(query.requiresPrescription !== undefined ? { requiresPrescription: query.requiresPrescription } : {}),
    // "Shop this pharmacy": only medicines that pharmacy actually stocks.
    ...(query.pharmacyId ? { inventory: { some: { pharmacyId: query.pharmacyId, isActive: true, stockQuantity: { gt: 0 } } } } : {}),
  };
  const include: Prisma.MedicineInclude = query.pharmacyId
    ? { category: summaryInclude.category, inventory: { where: { pharmacyId: query.pharmacyId }, select: { sellingPrice: true, stockQuantity: true } } }
    : summaryInclude;

  const [rows, total] = await prisma.$transaction([
    prisma.medicine.findMany({ where, include, orderBy: { [query.sort.field]: query.sort.direction }, ...toSkipTake(query) }),
    prisma.medicine.count({ where }),
  ]);

  return { data: rows.map(toSummary), total };
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function getMedicineDetail(idOrSlug: string): Promise<MedicineDetail> {
  const medicine = await prisma.medicine.findFirst({
    where: { ...(isUuidLike(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug }), isActive: true },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      inventory: {
        where: { ...inStockActivePharmacy, stockQuantity: { gt: 0 } },
        include: { pharmacy: { select: { id: true, name: true, slug: true, locality: true, avgRating: true, deliveryEtaMinMinutes: true, deliveryEtaMaxMinutes: true } } },
        orderBy: { sellingPrice: 'asc' },
      },
    },
  });
  if (!medicine) throw notFound('Medicine');

  return {
    ...toSummary(medicine),
    description: medicine.description,
    pharmacies: medicine.inventory.map((item) => ({
      pharmacyId: item.pharmacy.id,
      pharmacyName: item.pharmacy.name,
      pharmacySlug: item.pharmacy.slug,
      locality: item.pharmacy.locality,
      sellingPrice: Number(item.sellingPrice),
      mrp: Number(item.mrp),
      stockQuantity: item.stockQuantity,
      deliveryEtaMinMinutes: item.pharmacy.deliveryEtaMinMinutes,
      deliveryEtaMaxMinutes: item.pharmacy.deliveryEtaMaxMinutes,
      avgRating: Number(item.pharmacy.avgRating),
    })),
  };
}

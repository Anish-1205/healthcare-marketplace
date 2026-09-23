/**
 * The patient's cart. A cart belongs to exactly one pharmacy at a time (the schema's
 * `carts.pharmacyId` is a single column) — items from a different pharmacy replace it rather
 * than mixing, since pricing, stock and prescription acceptance are all pharmacy-specific.
 */

export interface CartPharmacyRef {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  locality: string | null;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  deliveryFee: number | null;
  freeDeliveryAbove: number | null;
  deliveryEtaMinMinutes: number | null;
  deliveryEtaMaxMinutes: number | null;
  acceptsPrescriptions: boolean;
}

export interface CartItemDetail {
  medicineId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  packSize: string;
  requiresPrescription: boolean;
  quantity: number;
  unitMrp: number;
  unitPrice: number;
  lineTotal: number;
  /** Current stock at the cart's pharmacy — may be less than `quantity` if stock dropped since adding. */
  availableStock: number;
  isAvailable: boolean;
}

export interface CartDetail {
  id: string | null;
  pharmacy: CartPharmacyRef | null;
  prescriptionId: string | null;
  prescriptionNumber: string | null;
  items: CartItemDetail[];
  itemCount: number;
  subtotalMrp: number;
  discountTotal: number;
  itemTotal: number;
  hasUnavailableItems: boolean;
  updatedAt: string | null;
}

export interface AddCartItemPayload {
  medicineId: string;
  pharmacyId: string;
  quantity?: number;
  /** Confirms replacing the cart when it currently holds a different pharmacy's items. */
  replace?: boolean;
}

export interface UpdateCartItemPayload {
  quantity: number;
}

export interface CartFromPrescriptionPayload {
  prescriptionId: string;
  pharmacyId: string;
}

export type UnmatchedReason = 'NOT_STOCKED' | 'NO_CATALOG_MATCH' | 'OUT_OF_STOCK';

export interface CartFromPrescriptionResult {
  cart: CartDetail;
  unmatchedItems: Array<{ medicineName: string; reason: UnmatchedReason }>;
}

/** One pharmacy's ability to fulfil a prescription, used on the "choose a pharmacy" step. */
export interface PrescriptionPharmacyMatch {
  pharmacy: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    locality: string | null;
    avgRating: number;
    reviewCount: number;
    isOpenNow: boolean;
    hoursLabel: string;
    deliveryAvailable: boolean;
    pickupAvailable: boolean;
    deliveryEtaMinMinutes: number | null;
    deliveryEtaMaxMinutes: number | null;
  };
  matchedItemCount: number;
  totalItemCount: number;
  estimatedTotal: number;
  hasAllItems: boolean;
}

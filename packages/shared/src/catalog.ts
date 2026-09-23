import type { ConsultationType, OrganizationType } from './statuses';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNDISCLOSED';

/** A single bookable slot, already excluding booked and blocked times. */
export interface AvailableSlot {
  start: string; // ISO datetime
  end: string; // ISO datetime
  organizationId: string | null;
  organizationName: string;
  consultationTypes: ConsultationType[];
}

export interface OrganizationRef {
  id: string;
  name: string;
  type: OrganizationType;
  locality: string | null;
}

export interface DoctorSummary {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
  qualifications: string;
  experienceYears: number;
  gender: Gender | null;
  languages: string[];
  specialties: string[];
  primarySpecialty: string;
  consultationFee: number;
  consultationTypes: ConsultationType[];
  avgRating: number;
  reviewCount: number;
  primaryOrganization: OrganizationRef | null;
  nextAvailableSlot: AvailableSlot | null;
}

export interface DoctorOrganizationLink {
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  organizationSlug: string;
  locality: string | null;
  title: string | null;
  isPrimary: boolean;
  consultationFee: number;
}

export interface DoctorAvailabilityWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  organizationId: string | null;
  organizationName: string;
  consultationTypes: ConsultationType[];
}

export interface ReviewSummary {
  id: string;
  patientName: string;
  patientAvatarUrl: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface DoctorDetail extends DoctorSummary {
  bio: string | null;
  registrationNumber: string;
  slotDurationMinutes: number;
  organizations: DoctorOrganizationLink[];
  availability: DoctorAvailabilityWindow[];
  reviews: ReviewSummary[];
}

export interface OrganizationServiceSummary {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  durationMinutes: number | null;
  specialty: string | null;
}

export interface OrganizationSummary {
  id: string;
  slug: string;
  name: string;
  type: OrganizationType;
  category: string | null;
  description: string | null;
  logoUrl: string | null;
  locality: string | null;
  city: string | null;
  distanceKm: number | null;
  avgRating: number;
  reviewCount: number;
  doctorCount: number;
  specialties: string[];
  isOpenNow: boolean;
  hoursLabel: string;
  is24Hours: boolean;
  // Pharmacy-only fields (undefined for clinics/hospitals)
  deliveryAvailable?: boolean;
  pickupAvailable?: boolean;
  acceptsPrescriptions?: boolean;
  deliveryEtaMinMinutes?: number | null;
  deliveryEtaMaxMinutes?: number | null;
}

export interface OrganizationDetail extends OrganizationSummary {
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  state: string | null;
  postalCode: string | null;
  bedCount?: number | null;
  emergencyAvailable?: boolean;
  deliveryFee?: number | null;
  freeDeliveryAbove?: number | null;
  services: OrganizationServiceSummary[];
  doctors: Array<DoctorSummary & { title: string | null }>;
  reviews: ReviewSummary[];
}

export interface MedicineSummary {
  id: string;
  slug: string;
  name: string;
  genericName: string;
  brand: string;
  manufacturer: string;
  category: { id: string; name: string; slug: string };
  strength: string | null;
  dosageForm: string;
  packSize: string;
  mrp: number;
  requiresPrescription: boolean;
  imageUrl: string | null;
  bestPrice: number | null;
  discountPercent: number | null;
  inStockPharmacyCount: number;
}

export interface MedicinePharmacyOffer {
  pharmacyId: string;
  pharmacyName: string;
  pharmacySlug: string;
  locality: string | null;
  sellingPrice: number;
  mrp: number;
  stockQuantity: number;
  deliveryEtaMinMinutes: number | null;
  deliveryEtaMaxMinutes: number | null;
  avgRating: number;
}

export interface MedicineDetail extends MedicineSummary {
  description: string | null;
  pharmacies: MedicinePharmacyOffer[];
}

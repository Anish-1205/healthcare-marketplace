import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type {
  AppointmentStatus,
  ConsultationType,
  DosageForm,
  FulfillmentType,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import {
  ALL_PERMISSIONS,
  DEMO_PASSWORD,
  ROLES,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type Role,
} from '@carebridge/shared';
import { ACTIVITY, type ActivityAction } from '../../services/activity-log.service';
import { formatSequence, sequenceKey } from '../../utils/sequence';
import { addMinutes, istDate, istDateTime, istParts } from '../../utils/time';
import { CLINICAL_TEMPLATES, GOLDEN_CONSULTATION, type ClinicalTemplate } from './clinical-templates';
import {
  DOCTORS,
  GOLDEN_PATIENT,
  ORGANIZATIONS,
  OTHER_PATIENT_SEEDS,
  PLATFORM_STAFF,
  type DoctorSeed,
  type OrganizationSeed,
  type PatientSeed,
} from './directory-data';
import { Random, round2, slugify } from './random';

// Static illustrations served by the web app from apps/web/public/demo/.
const PRODUCT_ART: Record<DosageForm, string> = {
  TABLET: 'tablet',
  CAPSULE: 'capsule',
  SYRUP: 'bottle',
  SUSPENSION: 'bottle',
  DROPS: 'bottle',
  CREAM: 'tube',
  OINTMENT: 'tube',
  GEL: 'tube',
  LOTION: 'tube',
  SPRAY: 'spray',
  INHALER: 'spray',
  POWDER: 'sachet',
  SACHET: 'sachet',
  DEVICE: 'device',
  OTHER: 'other',
};
import {
  CITY,
  DELIVERY_AGENTS,
  LAB_TESTS,
  LAB_TIME_SLOTS,
  LOCALITY_POSTCODES,
  MEDICINE_CATEGORIES,
  MEDICINES,
  SPECIALTIES,
  STATE,
} from './reference-data';

export type ScenarioState = 'ready' | 'complete';

export interface SeedOptions {
  /** `ready`: golden flow not yet performed. `complete`: golden records pre-seeded. */
  scenarioState?: ScenarioState;
  now?: Date;
  log?: (message: string) => void;
}

export type SeedSummary = Record<string, number>;

const RNG_SEED = 20260922;
const PLATFORM_FEE = 5;
const BCRYPT_ROUNDS = 10;

/** Golden scenario numbers. In `ready` mode the counters are set so the live demo produces them. */
const GOLDEN_RX_SEQUENCE = 125;
const GOLDEN_ORDER_SEQUENCE = 42;

// ─────────────────────────────────────────────────────────────
// Internal record types
// ─────────────────────────────────────────────────────────────

interface AvailabilityWindow {
  organizationId: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  slotDurationMinutes: number;
  consultationTypes: ConsultationType[];
}

interface OrgRecord {
  id: string;
  seed: OrganizationSeed;
  createdAt: Date;
  adminUserId: string;
  staffUserIds: string[];
}

interface DoctorRecord {
  id: string;
  userId: string;
  seed: DoctorSeed;
  name: string;
  primarySpecialty: string;
  orgFees: Map<string, number>;
  windows: AvailabilityWindow[];
  blockedDates: Set<string>;
}

interface PatientRecord {
  id: string;
  userId: string;
  seed: PatientSeed;
  name: string;
  createdAt: Date;
  homeAddress: Prisma.AddressCreateManyInput & { id: string };
}

interface Slot {
  start: Date;
  end: Date;
  organizationId: string | null;
  types: ConsultationType[];
}

interface PrescriptionRecord {
  row: Prisma.PrescriptionCreateManyInput & { id: string; issuedAt: Date };
  patient: PatientRecord;
  doctor: DoctorRecord;
  lines: Array<{ medicineKey: string; quantity: number }>;
  golden?: boolean;
}

interface InventoryEntry {
  mrp: number;
  sellingPrice: number;
  stock: number;
}

interface OrderSpec {
  patient: PatientRecord;
  pharmacy: OrgRecord;
  prescription?: PrescriptionRecord;
  lines: Array<{ medicineKey: string; quantity: number }>;
  placedAt: Date;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod;
  /** Patient-uploaded prescription (used when the order is not linked to an in-app prescription). */
  uploadedDocumentId?: string;
  golden?: boolean;
  rejectionReason?: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};
const fromMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const fullName = (first: string, last: string) => `${first} ${last}`;

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

const ROLE_SCOPE: Record<Role, 'PATIENT' | 'PROVIDER' | 'ORGANIZATION' | 'PLATFORM'> = {
  PATIENT: 'PATIENT',
  DOCTOR: 'PROVIDER',
  CLINIC_ADMIN: 'ORGANIZATION',
  CLINIC_STAFF: 'ORGANIZATION',
  HOSPITAL_ADMIN: 'ORGANIZATION',
  HOSPITAL_STAFF: 'ORGANIZATION',
  PHARMACY_ADMIN: 'ORGANIZATION',
  PHARMACY_STAFF: 'ORGANIZATION',
  PLATFORM_EMPLOYEE: 'PLATFORM',
  PLATFORM_ADMIN: 'PLATFORM',
  SUPER_ADMIN: 'PLATFORM',
};

const ORG_ROLES: Record<OrganizationSeed['type'], { admin: Role; staff: Role }> = {
  CLINIC: { admin: 'CLINIC_ADMIN', staff: 'CLINIC_STAFF' },
  HOSPITAL: { admin: 'HOSPITAL_ADMIN', staff: 'HOSPITAL_STAFF' },
  PHARMACY: { admin: 'PHARMACY_ADMIN', staff: 'PHARMACY_STAFF' },
};

const DOCTOR_REVIEW_COMMENTS: Record<number, string[]> = {
  5: [
    'Very patient and explained everything clearly. Highly recommended.',
    'Listened carefully to all my concerns. The treatment plan worked well.',
    'Punctual, professional and very kind. Felt comfortable throughout.',
    'Excellent doctor — took time to answer every question.',
    'The video consultation was smooth and the advice was practical.',
  ],
  4: [
    'Good consultation and clear instructions. Slight wait at the clinic.',
    'Knowledgeable doctor. Would have liked a little more time.',
    'Helpful advice and follow-up reminders. Overall a good experience.',
  ],
  3: ['Consultation was fine but the waiting time was long.', 'Okay experience. The doctor seemed rushed.'],
};

const ORG_REVIEW_COMMENTS: Record<number, string[]> = {
  5: ['Clean, well organised and friendly staff.', 'Smooth check-in and no waiting. Great facility.', 'Staff were courteous and helpful throughout.'],
  4: ['Good facility, parking can be difficult.', 'Nice staff, slightly crowded in the evening.'],
  3: ['Average experience, reception could be faster.'],
};

const PHARMACY_REVIEW_COMMENTS: Record<number, string[]> = {
  5: ['Delivery was quick and medicines were well packed.', 'Always has what I need. Very reliable.', 'Prescription order was verified and delivered within the hour.'],
  4: ['Good prices. Delivery took a little longer than the ETA.', 'Helpful pharmacist, easy ordering.'],
  3: ['One item was out of stock, rest was fine.'],
};

const CANCEL_REASONS = ['Schedule conflict', 'Feeling better, no longer needed', 'Booked by mistake', 'Travelling out of town'];

// ─────────────────────────────────────────────────────────────
// Seed entry point
// ─────────────────────────────────────────────────────────────

export async function seedDatabase(prisma: PrismaClient, options: SeedOptions = {}): Promise<SeedSummary> {
  const scenario: ScenarioState = options.scenarioState ?? 'ready';
  const now = options.now ?? new Date();
  const log = options.log ?? (() => undefined);
  const rng = new Random(RNG_SEED);
  const year = istParts(now).year;

  const at = (dayOffset: number, time: string) => istDateTime(dayOffset, time, now);
  const daysAgo = (days: number, time = '10:00') => at(-days, time);
  const minutesAgo = (minutes: number) => addMinutes(now, -minutes);

  log(`Seeding CareBridge demo data (scenario: ${scenario})`);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  // Row buffers, inserted in FK order at the end.
  const rows = {
    roles: [] as Prisma.RoleCreateManyInput[],
    permissions: [] as Prisma.PermissionCreateManyInput[],
    rolePermissions: [] as Prisma.RolePermissionCreateManyInput[],
    users: [] as Prisma.UserCreateManyInput[],
    userRoles: [] as Prisma.UserRoleCreateManyInput[],
    employees: [] as Prisma.PlatformEmployeeCreateManyInput[],
    specialties: [] as Prisma.SpecialtyCreateManyInput[],
    categories: [] as Prisma.MedicineCategoryCreateManyInput[],
    organizations: [] as Prisma.OrganizationCreateManyInput[],
    medicines: [] as Prisma.MedicineCreateManyInput[],
    orgStaff: [] as Prisma.OrganizationStaffCreateManyInput[],
    orgServices: [] as Prisma.OrganizationServiceCreateManyInput[],
    patients: [] as Prisma.PatientCreateManyInput[],
    addresses: [] as Prisma.AddressCreateManyInput[],
    doctors: [] as Prisma.DoctorCreateManyInput[],
    doctorSpecialties: [] as Prisma.DoctorSpecialtyCreateManyInput[],
    doctorOrganizations: [] as Prisma.DoctorOrganizationCreateManyInput[],
    availability: [] as Prisma.DoctorAvailabilityCreateManyInput[],
    blockedDates: [] as Prisma.DoctorBlockedDateCreateManyInput[],
    inventory: [] as Prisma.PharmacyInventoryCreateManyInput[],
    labTests: [] as Prisma.LabTestCreateManyInput[],
    labPackageItems: [] as Prisma.LabPackageItemCreateManyInput[],
    documents: [] as Prisma.DocumentCreateManyInput[],
    appointments: [] as Array<Prisma.AppointmentCreateManyInput & { id: string; createdAt: Date }>,
    appointmentHistory: [] as Prisma.AppointmentStatusHistoryCreateManyInput[],
    consultations: [] as Prisma.ConsultationCreateManyInput[],
    prescriptions: [] as PrescriptionRecord[],
    prescriptionItems: [] as Prisma.PrescriptionItemCreateManyInput[],
    orders: [] as Array<Prisma.OrderCreateManyInput & { id: string; placedAt: Date }>,
    orderItems: [] as Prisma.OrderItemCreateManyInput[],
    orderHistory: [] as Prisma.OrderStatusHistoryCreateManyInput[],
    deliveries: [] as Prisma.DeliveryCreateManyInput[],
    deliveryHistory: [] as Prisma.DeliveryStatusHistoryCreateManyInput[],
    labBookings: [] as Array<Prisma.LabBookingCreateManyInput & { id: string; createdAt: Date }>,
    labBookingItems: [] as Prisma.LabBookingItemCreateManyInput[],
    payments: [] as Array<Omit<Prisma.PaymentCreateManyInput, 'transactionRef'> & { createdAt: Date }>,
    reviews: [] as Prisma.ReviewCreateManyInput[],
    favorites: [] as Prisma.FavoriteCreateManyInput[],
    notifications: [] as Prisma.NotificationCreateManyInput[],
    activityLogs: [] as Prisma.ActivityLogCreateManyInput[],
    carts: [] as Prisma.CartCreateManyInput[],
    cartItems: [] as Prisma.CartItemCreateManyInput[],
    settings: [] as Prisma.PlatformSettingCreateManyInput[],
    counters: [] as Prisma.SequenceCounterCreateManyInput[],
  };

  const activity = (
    action: ActivityAction,
    entityType: string,
    entityId: string | null,
    description: string,
    createdAt: Date,
    actorUserId: string | null = null,
    organizationId: string | null = null,
  ) => {
    rows.activityLogs.push({ id: randomUUID(), action, entityType, entityId, description, createdAt, actorUserId, organizationId });
  };

  const notify = (
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    createdAt: Date,
    link: string | null,
    entity?: { type: string; id: string },
  ) => {
    const ageHours = (now.getTime() - createdAt.getTime()) / 3_600_000;
    const isRead = ageHours > 48 || (ageHours > 6 && rng.chance(0.5));
    rows.notifications.push({
      id: randomUUID(),
      userId,
      type,
      title,
      message,
      link,
      entityType: entity?.type,
      entityId: entity?.id,
      isRead,
      readAt: isRead ? addMinutes(createdAt, rng.int(10, 600)) : null,
      createdAt,
    });
  };

  // ── Roles & permissions ──────────────────────────────────
  const roleIds = new Map<Role, string>();
  for (const role of ROLES) {
    const id = randomUUID();
    roleIds.set(role, id);
    rows.roles.push({ id, name: role, label: ROLE_LABELS[role], scope: ROLE_SCOPE[role], description: `${ROLE_LABELS[role]} role` });
  }
  const permissionIds = new Map<string, string>();
  for (const key of ALL_PERMISSIONS) {
    const id = randomUUID();
    permissionIds.set(key, id);
    rows.permissions.push({ id, key, module: key.split('.')[0], description: key.replace(/[.-]/g, ' ') });
  }
  for (const role of ROLES) {
    for (const permission of ROLE_PERMISSIONS[role]) {
      rows.rolePermissions.push({ roleId: roleIds.get(role)!, permissionId: permissionIds.get(permission)! });
    }
  }

  const emailsSeen = new Set<string>();
  const addUser = (input: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    roles: Role[];
    createdAt: Date;
  }): string => {
    const email = input.email.toLowerCase();
    if (emailsSeen.has(email)) throw new Error(`Duplicate seed email: ${email}`);
    emailsSeen.add(email);
    const id = randomUUID();
    rows.users.push({
      id,
      email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      status: 'ACTIVE',
      createdAt: input.createdAt,
      lastLoginAt: addMinutes(now, -rng.int(30, 60 * 24 * 5)),
    });
    for (const role of input.roles) rows.userRoles.push({ userId: id, roleId: roleIds.get(role)!, createdAt: input.createdAt });
    return id;
  };

  // ── Platform staff ───────────────────────────────────────
  const platformUsers = new Map<string, string>();
  for (const staff of PLATFORM_STAFF) {
    const userId = addUser({ ...staff, roles: [staff.role], createdAt: daysAgo(200) });
    platformUsers.set(staff.email, userId);
    rows.employees.push({ id: randomUUID(), userId, employeeCode: staff.code, department: staff.department, jobTitle: staff.title ?? staff.role });
  }
  const adminUserId = platformUsers.get('admin@carebridge.demo')!;
  const employeeUserId = platformUsers.get('employee@carebridge.demo')!;
  const superAdminUserId = platformUsers.get('superadmin@carebridge.demo')!;
  const approverIds = [adminUserId, employeeUserId];

  // ── Catalogue reference data ─────────────────────────────
  const specialtyIds = new Map<string, string>();
  SPECIALTIES.forEach((specialty, index) => {
    const id = randomUUID();
    specialtyIds.set(specialty.slug, id);
    rows.specialties.push({ id, ...specialty, sortOrder: index });
  });

  const categoryIds = new Map<string, string>();
  MEDICINE_CATEGORIES.forEach((category, index) => {
    const id = randomUUID();
    categoryIds.set(category.slug, id);
    rows.categories.push({ id, ...category, imageUrl: `/demo/categories/${category.slug}.svg`, sortOrder: index });
  });

  const medicineIds = new Map<string, string>();
  const medicineByKey = new Map(MEDICINES.map((medicine) => [medicine.key, medicine]));
  for (const medicine of MEDICINES) {
    const id = randomUUID();
    medicineIds.set(medicine.key, id);
    const { key, category, ...fields } = medicine;
    rows.medicines.push({ id, ...fields, slug: slugify(medicine.name), categoryId: categoryIds.get(category)!, imageUrl: `/demo/medicines/${PRODUCT_ART[medicine.dosageForm]}.svg`, createdAt: daysAgo(190) });
  }

  const labTestIds = new Map<string, string>();
  for (const test of LAB_TESTS) {
    const id = randomUUID();
    labTestIds.set(test.code, id);
    const { includes, isPopular, ...fields } = test;
    rows.labTests.push({ id, ...fields, slug: slugify(test.name), isPackage: Boolean(includes), isPopular: Boolean(isPopular) });
  }
  for (const test of LAB_TESTS) {
    for (const code of test.includes ?? []) rows.labPackageItems.push({ packageId: labTestIds.get(test.code)!, testId: labTestIds.get(code)! });
  }

  // ── Organizations (tenants) ──────────────────────────────
  const orgs = new Map<string, OrgRecord>();
  for (const seed of ORGANIZATIONS) {
    const id = randomUUID();
    const createdAt = daysAgo(seed.createdDaysAgo, '11:30');
    const approved = seed.approvalStatus === 'APPROVED';
    rows.organizations.push({
      id,
      type: seed.type,
      name: seed.name,
      slug: slugify(seed.name),
      category: seed.category,
      description: seed.description,
      logoUrl: `/demo/organizations/${seed.type.toLowerCase()}.svg`,
      phone: seed.phone,
      email: seed.email,
      registrationNumber: `REG-${seed.type.slice(0, 3)}-${String(1000 + rows.organizations.length)}`,
      licenseNumber: seed.type === 'PHARMACY' ? `DL-KA-DEMO-${20400 + rows.organizations.length}` : null,
      contactPerson: fullName(seed.admin.firstName, seed.admin.lastName),
      addressLine1: seed.addressLine1,
      locality: seed.locality,
      city: CITY,
      state: STATE,
      postalCode: LOCALITY_POSTCODES[seed.locality],
      distanceKm: seed.distanceKm,
      opensAt: seed.opensAt,
      closesAt: seed.closesAt,
      is24Hours: seed.is24Hours ?? false,
      openDays: seed.openDays,
      bedCount: seed.bedCount,
      emergencyAvailable: seed.emergencyAvailable ?? false,
      deliveryAvailable: seed.pharmacy?.deliveryAvailable ?? false,
      pickupAvailable: seed.pharmacy?.pickupAvailable ?? false,
      acceptsPrescriptions: seed.type === 'PHARMACY',
      deliveryEtaMinMinutes: seed.pharmacy?.etaMin,
      deliveryEtaMaxMinutes: seed.pharmacy?.etaMax,
      deliveryFee: seed.pharmacy?.deliveryFee,
      freeDeliveryAbove: seed.pharmacy?.freeDeliveryAbove,
      serviceRadiusKm: seed.pharmacy?.serviceRadiusKm,
      approvalStatus: seed.approvalStatus,
      approvedAt: approved ? addMinutes(createdAt, 60 * 26) : null,
      rejectionReason: seed.rejectionReason,
      createdAt,
    });

    const roles = ORG_ROLES[seed.type];
    const adminUserId_ = addUser({ ...seed.admin, roles: [roles.admin], createdAt });
    rows.orgStaff.push({ id: randomUUID(), organizationId: id, userId: adminUserId_, staffRole: 'ADMIN', title: seed.admin.title, joinedAt: createdAt, createdAt });
    const staffUserIds: string[] = [];
    for (const staff of seed.staff ?? []) {
      const staffCreated = addMinutes(createdAt, 60 * 24 * rng.int(3, 20));
      const staffId = addUser({ ...staff, roles: [roles.staff], createdAt: staffCreated });
      staffUserIds.push(staffId);
      rows.orgStaff.push({ id: randomUUID(), organizationId: id, userId: staffId, staffRole: 'STAFF', title: staff.title, joinedAt: staffCreated, createdAt: staffCreated });
    }

    for (const service of seed.services ?? []) {
      rows.orgServices.push({
        id: randomUUID(),
        organizationId: id,
        specialtyId: service.specialty ? specialtyIds.get(service.specialty) : null,
        name: service.name,
        description: service.description,
        price: service.price,
        durationMinutes: service.durationMinutes,
      });
    }

    orgs.set(seed.key, { id, seed, createdAt, adminUserId: adminUserId_, staffUserIds });

    const typeLabel = seed.type.charAt(0) + seed.type.slice(1).toLowerCase();
    activity(ACTIVITY.ORGANIZATION_REGISTERED, 'Organization', id, `${seed.name} registered as a ${typeLabel.toLowerCase()}`, createdAt, adminUserId_, id);
    if (approved) {
      activity(ACTIVITY.ORGANIZATION_APPROVED, 'Organization', id, `${seed.name} was approved`, addMinutes(createdAt, 60 * 26), rng.pick(approverIds), id);
    } else if (seed.approvalStatus === 'REJECTED') {
      activity(ACTIVITY.ORGANIZATION_REJECTED, 'Organization', id, `${seed.name} was rejected: ${seed.rejectionReason}`, addMinutes(createdAt, 60 * 30), adminUserId, id);
    } else {
      // Pending: admins are notified and registration documents are on file.
      for (const recipient of [adminUserId, employeeUserId, superAdminUserId]) {
        notify(recipient, 'REGISTRATION_SUBMITTED', `New ${typeLabel.toLowerCase()} registration`, `${seed.name} submitted a registration and is awaiting approval.`, createdAt, '/admin/approvals', { type: 'Organization', id });
      }
      for (const [type, title, fileName] of [
        ['REGISTRATION_CERTIFICATE', 'Business registration certificate', 'registration-certificate.pdf'],
        ['LICENSE', seed.type === 'PHARMACY' ? 'Drug licence' : 'Clinical establishment licence', 'licence.pdf'],
      ] as const) {
        rows.documents.push({ id: randomUUID(), uploadedById: adminUserId_, organizationId: id, type, title, fileName, mimeType: 'application/pdf', sizeBytes: rng.int(180_000, 900_000), storageUrl: `/demo/documents/${fileName}`, createdAt });
      }
    }
  }

  const approvedOrgs = [...orgs.values()].filter((org) => org.seed.approvalStatus === 'APPROVED');
  const approvedPharmacies = approvedOrgs.filter((org) => org.seed.type === 'PHARMACY');
  const org = (key: string) => orgs.get(key)!;

  // ── Pharmacy inventory ───────────────────────────────────
  const goldenKeys = GOLDEN_CONSULTATION.items.map((item) => item.medicine);
  const forcedExclusions: Record<string, string[]> = {
    healthfirst: ['calamine'],
    greencross: ['calamine', 'hydrocortisone'],
    communitymeds: ['hydrocortisone', 'levocetirizine-5', 'moisturizer'],
  };
  const forcedInclusions: Record<string, string[]> = {
    citycare: [...goldenKeys, 'paracetamol-650', 'cetirizine-10', 'ors', 'vitd3-2000', 'multivitamin'],
    medpoint: [...goldenKeys, 'aceclofenac-para', 'diclofenac-gel', 'hot-water-bag', 'vitd3-2000', 'omega3', 'multivitamin'],
  };
  const inventory = new Map<string, Map<string, InventoryEntry>>();
  for (const pharmacy of approvedPharmacies) {
    const stock = new Map<string, InventoryEntry>();
    const coverage = pharmacy.seed.pharmacy!.catalogueCoverage;
    for (const medicine of MEDICINES) {
      const forced = forcedInclusions[pharmacy.seed.key]?.includes(medicine.key);
      if (forcedExclusions[pharmacy.seed.key]?.includes(medicine.key)) continue;
      if (!forced && !rng.chance(coverage)) continue;

      const discount = medicine.dosageForm === 'DEVICE' ? rng.pick([0, 5, 8, 10]) : rng.pick([0, 5, 8, 10, 12, 15, 18, 20]);
      const sellingPrice = Math.max(1, Math.round(medicine.mrp * (1 - discount / 100)));
      const roll = rng.next();
      let quantity = roll < 0.04 ? 0 : roll < 0.12 ? rng.int(2, 9) : rng.int(18, 180);
      if (forced) quantity = Math.max(quantity, rng.int(30, 120));

      stock.set(medicine.key, { mrp: medicine.mrp, sellingPrice, stock: quantity });
      rows.inventory.push({
        id: randomUUID(),
        pharmacyId: pharmacy.id,
        medicineId: medicineIds.get(medicine.key)!,
        mrp: medicine.mrp,
        sellingPrice,
        stockQuantity: quantity,
        lowStockThreshold: 10,
        batchNumber: `B${pharmacy.seed.key.slice(0, 2).toUpperCase()}${rng.int(10000, 99999)}`,
        expiryDate: istDate(rng.int(180, 720), now),
        createdAt: addMinutes(pharmacy.createdAt, 60 * 24 * 2),
      });
    }
    inventory.set(pharmacy.id, stock);
  }

  // ── Doctors ──────────────────────────────────────────────
  const doctors = new Map<string, DoctorRecord>();
  DOCTORS.forEach((seed, index) => {
    const id = randomUUID();
    const createdAt = daysAgo(seed.createdDaysAgo, '15:00');
    const approved = seed.approvalStatus === 'APPROVED';
    const userId = addUser({
      email: seed.email,
      firstName: seed.firstName,
      lastName: seed.lastName,
      phone: `+91 98860 ${String(40000 + index * 137).slice(0, 5)}`,
      roles: ['DOCTOR'],
      createdAt,
    });
    const name = `Dr. ${seed.firstName} ${seed.lastName}`;

    rows.doctors.push({
      id,
      userId,
      slug: slugify(`dr ${seed.firstName} ${seed.lastName}`),
      registrationNumber: `KMC-DEMO-${String(52000 + index * 17)}`,
      qualifications: seed.qualifications,
      experienceYears: seed.experienceYears,
      bio: seed.bio,
      gender: seed.gender,
      languages: seed.languages,
      consultationFee: seed.fee,
      consultationTypes: seed.consultationTypes,
      slotDurationMinutes: seed.slotDurationMinutes,
      approvalStatus: seed.approvalStatus,
      approvedAt: approved ? addMinutes(createdAt, 60 * 20) : null,
      createdAt,
    });
    seed.specialties.forEach((slug, i) => rows.doctorSpecialties.push({ doctorId: id, specialtyId: specialtyIds.get(slug)!, isPrimary: i === 0 }));

    const orgFees = new Map<string, number>();
    const windows: AvailabilityWindow[] = [];
    const remoteTypes = seed.consultationTypes.filter((type) => type !== 'IN_PERSON');

    seed.organizations.forEach((relation, relationIndex) => {
      const orgRecord = org(relation.key);
      const fee = relation.fee ?? seed.fee;
      orgFees.set(orgRecord.id, fee);
      rows.doctorOrganizations.push({
        id: randomUUID(),
        doctorId: id,
        organizationId: orgRecord.id,
        title: relation.title,
        consultationFee: relation.fee ?? null,
        isPrimary: Boolean(relation.primary),
        joinedAt: createdAt,
        createdAt,
      });

      if (relation.primary) {
        for (const day of [1, 2, 3, 4, 5, 6]) {
          windows.push({ organizationId: orgRecord.id, dayOfWeek: day, startTime: '10:00', endTime: '18:00', breakStartTime: '13:00', breakEndTime: '14:00', slotDurationMinutes: seed.slotDurationMinutes, consultationTypes: seed.consultationTypes });
        }
        if (seed.sundayHours) {
          windows.push({ organizationId: orgRecord.id, dayOfWeek: 0, startTime: '10:00', endTime: '13:00', slotDurationMinutes: seed.slotDurationMinutes, consultationTypes: seed.consultationTypes });
        }
      } else {
        const days = relationIndex % 2 === 1 ? [2, 4] : [3, 6];
        for (const day of days) {
          windows.push({ organizationId: orgRecord.id, dayOfWeek: day, startTime: '18:30', endTime: '20:30', slotDurationMinutes: seed.slotDurationMinutes, consultationTypes: seed.consultationTypes });
        }
      }
    });

    if (seed.organizations.length === 0) {
      // Independent / freelance doctor — online practice.
      for (const day of [1, 2, 3, 4, 5, 6]) {
        windows.push({ organizationId: null, dayOfWeek: day, startTime: '10:00', endTime: '13:00', slotDurationMinutes: seed.slotDurationMinutes, consultationTypes: remoteTypes });
        windows.push({ organizationId: null, dayOfWeek: day, startTime: '17:00', endTime: '20:30', slotDurationMinutes: seed.slotDurationMinutes, consultationTypes: remoteTypes });
      }
      if (seed.sundayHours) {
        windows.push({ organizationId: null, dayOfWeek: 0, startTime: '10:00', endTime: '12:00', slotDurationMinutes: seed.slotDurationMinutes, consultationTypes: remoteTypes });
      }
    } else if (remoteTypes.length > 0) {
      // Evening online hours after clinic time.
      for (const day of [1, 2, 3, 4, 5]) {
        windows.push({ organizationId: null, dayOfWeek: day, startTime: '20:30', endTime: '21:30', slotDurationMinutes: seed.slotDurationMinutes, consultationTypes: remoteTypes });
      }
    }

    for (const window of windows) rows.availability.push({ id: randomUUID(), doctorId: id, ...window, createdAt });

    const blockedDates = new Set<string>();
    const blocked: Record<string, Array<[number, string]>> = {
      'maya-rao': [[12, 'Dermatology workshop']],
      'karan-patel': [[3, 'Cardiology conference']],
      'priya-nair': [[8, 'Personal leave']],
      'rohan-kapoor': [[-10, 'Surgery day']],
    };
    for (const [offset, reason] of blocked[seed.key] ?? []) {
      const date = istDate(offset, now);
      blockedDates.add(dateKey(date));
      rows.blockedDates.push({ id: randomUUID(), doctorId: id, date, reason });
    }

    doctors.set(seed.key, { id, userId, seed, name, primarySpecialty: seed.specialties[0], orgFees, windows, blockedDates });

    activity(ACTIVITY.DOCTOR_REGISTERED, 'Doctor', id, `${name} registered as a doctor`, createdAt, userId);
    if (approved) {
      activity(ACTIVITY.DOCTOR_APPROVED, 'Doctor', id, `${name} was approved`, addMinutes(createdAt, 60 * 20), rng.pick(approverIds));
    } else {
      for (const recipient of [adminUserId, employeeUserId, superAdminUserId]) {
        notify(recipient, 'REGISTRATION_SUBMITTED', 'New doctor registration', `${name} (${SPECIALTIES.find((s) => s.slug === seed.specialties[0])?.name}) is awaiting approval.`, createdAt, '/admin/approvals', { type: 'Doctor', id });
      }
      rows.documents.push({ id: randomUUID(), uploadedById: userId, type: 'LICENSE', title: 'Medical council registration certificate', fileName: 'medical-registration.pdf', mimeType: 'application/pdf', sizeBytes: rng.int(200_000, 700_000), storageUrl: '/demo/documents/medical-registration.pdf', createdAt });
    }
  });

  const approvedDoctors = [...doctors.values()].filter((doctor) => doctor.seed.approvalStatus === 'APPROVED');
  const doctor = (key: string) => doctors.get(key)!;

  // ── Patients ─────────────────────────────────────────────
  const patients: PatientRecord[] = [];
  const addPatient = (seed: PatientSeed, index: number) => {
    const createdAt = daysAgo(seed.createdDaysAgo, `${String(9 + (index % 10)).padStart(2, '0')}:15`);
    const phone = `+91 9${String(8000000000 + index * 7919137).slice(1, 5)} ${String(10000 + index * 311).slice(0, 5)}`;
    const userId = addUser({ email: seed.email, firstName: seed.firstName, lastName: seed.lastName, phone, roles: ['PATIENT'], createdAt });
    const id = randomUUID();
    const isGolden = seed.email === GOLDEN_PATIENT.email;
    const name = fullName(seed.firstName, seed.lastName);

    const homeAddress = {
      id: randomUUID(),
      userId,
      label: 'Home',
      recipient: name,
      phone,
      line1: isGolden ? 'Flat 402, Palm Residency' : `${rng.int(1, 250)}, ${rng.pick(['Rose', 'Lotus', 'Maple', 'Banyan', 'Jasmine', 'Palm'])} ${rng.pick(['Apartments', 'Residency', 'Enclave', 'Villas'])}`,
      line2: isGolden ? '5th Cross, MG Link Road' : `${rng.int(1, 12)}th Main Road`,
      landmark: isGolden ? 'Near Central Park' : null,
      locality: seed.locality,
      city: CITY,
      state: STATE,
      postalCode: LOCALITY_POSTCODES[seed.locality],
      isDefault: true,
      createdAt,
    } satisfies Prisma.AddressCreateManyInput;
    rows.addresses.push(homeAddress);
    if (isGolden || rng.chance(0.3)) {
      rows.addresses.push({
        id: randomUUID(),
        userId,
        label: 'Office',
        recipient: name,
        phone,
        line1: isGolden ? 'Level 6, Orion Tech Tower' : `${rng.pick(['Orion', 'Nova', 'Vertex', 'Summit'])} Business Park, Block ${rng.pick(['A', 'B', 'C'])}`,
        line2: 'Outer Ring Road',
        locality: 'Tech Park',
        city: CITY,
        state: STATE,
        postalCode: LOCALITY_POSTCODES['Tech Park'],
        isDefault: false,
        createdAt,
      });
    }

    rows.patients.push({
      id,
      userId,
      patientCode: `PT-${String(index + 1).padStart(5, '0')}`,
      dateOfBirth: new Date(`${seed.dob}T00:00:00Z`),
      gender: seed.gender,
      bloodGroup: seed.bloodGroup,
      emergencyContactName: isGolden ? 'Sunita Verma' : rng.chance(0.7) ? `${rng.pick(['Anil', 'Kavita', 'Sunil', 'Rekha', 'Prakash', 'Asha'])} ${seed.lastName}` : null,
      emergencyContactPhone: isGolden ? '+91 98450 77881' : `+91 98${rng.int(100, 999)} ${rng.int(10000, 99999)}`,
      emergencyContactRelation: isGolden ? 'Mother' : rng.pick(['Spouse', 'Parent', 'Sibling', 'Child']),
      preferredPharmacyId: isGolden ? org('citycare').id : rng.chance(0.5) ? rng.pick(approvedPharmacies).id : null,
      createdAt,
    });

    const record: PatientRecord = { id, userId, seed, name, createdAt, homeAddress };
    patients.push(record);
    activity(ACTIVITY.PATIENT_REGISTERED, 'User', userId, `${name} registered as a patient`, createdAt, userId);
    return record;
  };

  const rahul = addPatient(GOLDEN_PATIENT, 0);
  OTHER_PATIENT_SEEDS.forEach((seed, index) => addPatient(seed, index + 1));
  const otherPatients = patients.filter((patient) => patient !== rahul);

  // ── Appointment generation ───────────────────────────────
  const bookedSlots = new Set<string>();
  const slotKey = (doctorId: string, start: Date) => `${doctorId}|${start.getTime()}`;

  const slotsFor = (doc: DoctorRecord, dayOffset: number): Slot[] => {
    if (doc.blockedDates.has(dateKey(istDate(dayOffset, now)))) return [];
    const { dayOfWeek } = istParts(at(dayOffset, '12:00'));
    const slots: Slot[] = [];
    for (const window of doc.windows.filter((w) => w.dayOfWeek === dayOfWeek)) {
      const duration = window.slotDurationMinutes;
      for (let t = toMinutes(window.startTime); t + duration <= toMinutes(window.endTime); t += duration) {
        if (window.breakStartTime && window.breakEndTime && t < toMinutes(window.breakEndTime) && t + duration > toMinutes(window.breakStartTime)) continue;
        const start = at(dayOffset, fromMinutes(t));
        slots.push({ start, end: addMinutes(start, duration), organizationId: window.organizationId, types: window.consultationTypes });
      }
    }
    return slots.filter((slot) => !bookedSlots.has(slotKey(doc.id, slot.start)));
  };

  const findSlot = (doc: DoctorRecord, dayOffset: number, time?: string): Slot | null => {
    const slots = slotsFor(doc, dayOffset);
    if (time) return slots.find((slot) => slot.start.getTime() === at(dayOffset, time).getTime()) ?? null;
    return slots.length ? rng.pick(slots) : null;
  };

  const templateFor = (doc: DoctorRecord): ClinicalTemplate =>
    rng.pick(CLINICAL_TEMPLATES[doc.primarySpecialty] ?? CLINICAL_TEMPLATES['general-physician']);

  const orgName = (organizationId: string | null) =>
    organizationId ? [...orgs.values()].find((o) => o.id === organizationId)!.seed.name : 'Online consultation';

  const addPayment = (payment: Omit<Prisma.PaymentCreateManyInput, 'transactionRef' | 'id'> & { createdAt: Date }) => {
    rows.payments.push({ id: randomUUID(), ...payment });
  };

  const methodDetail = (method: PaymentMethod, patient: PatientRecord) => {
    if (method === 'CARD') return `${rng.pick(['VISA', 'Mastercard', 'RuPay'])} •••• ${rng.int(1000, 9999)}`;
    if (method === 'UPI') return `${patient.seed.firstName.toLowerCase()}.${patient.seed.lastName.toLowerCase()}@okdemo`;
    return null;
  };

  interface AppointmentInput {
    patient: PatientRecord;
    doc: DoctorRecord;
    slot: Slot;
    status: AppointmentStatus;
    type?: ConsultationType;
    template?: ClinicalTemplate;
    createdAt?: Date;
    paymentMethod?: PaymentMethod;
    golden?: boolean;
    withPrescription?: boolean;
  }

  const addAppointment = (input: AppointmentInput) => {
    const { patient, doc, slot, status } = input;
    bookedSlots.add(slotKey(doc.id, slot.start));
    const id = randomUUID();
    const template = input.template ?? templateFor(doc);
    const type =
      input.type ??
      (slot.types.includes('IN_PERSON') ? rng.weighted<ConsultationType>([['IN_PERSON', 6], ...slot.types.filter((t) => t !== 'IN_PERSON').map((t) => [t, 2] as const)]) : rng.pick(slot.types));
    const fee = slot.organizationId ? doc.orgFees.get(slot.organizationId) ?? Number(doc.seed.fee) : doc.seed.fee;
    const bookedAt = input.createdAt ?? new Date(Math.min(addMinutes(slot.start, -60 * 24 * rng.int(1, 6) - rng.int(0, 600)).getTime(), minutesAgo(rng.int(30, 600)).getTime()));
    const createdAt = bookedAt < patient.createdAt ? addMinutes(patient.createdAt, 60) : bookedAt;
    const duration = (slot.end.getTime() - slot.start.getTime()) / 60_000;

    const reachedCheckIn = ['CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED'].includes(status);
    const reachedStart = ['IN_CONSULTATION', 'COMPLETED'].includes(status);
    // Remote consultations skip the front-desk check-in unless the patient is currently waiting.
    const checkedInAt = reachedCheckIn && (type === 'IN_PERSON' || status === 'CHECKED_IN') ? addMinutes(slot.start, -rng.int(5, 15)) : null;
    const startedAt = reachedStart ? addMinutes(slot.start, rng.int(0, 8)) : null;
    const completedAt = status === 'COMPLETED' ? addMinutes(startedAt!, Math.max(10, duration - rng.int(0, 5))) : null;
    const cancelledAt = status === 'CANCELLED' ? addMinutes(createdAt, rng.int(60, 60 * 24)) : null;

    rows.appointments.push({
      id,
      appointmentNumber: '',
      patientId: patient.id,
      doctorId: doc.id,
      organizationId: slot.organizationId,
      consultationType: type,
      scheduledStart: slot.start,
      scheduledEnd: slot.end,
      status,
      reason: template.reason,
      fee,
      cancellationReason: status === 'CANCELLED' ? rng.pick(CANCEL_REASONS) : null,
      cancelledAt,
      checkedInAt,
      startedAt,
      completedAt,
      createdAt,
      updatedAt: completedAt ?? cancelledAt ?? createdAt,
    });

    // Status history
    const history: Array<[AppointmentStatus | null, AppointmentStatus, Date, string | null]> = [[null, 'PENDING', createdAt, patient.userId]];
    if (status !== 'PENDING') {
      if (status === 'CANCELLED') {
        history.push(['PENDING', 'CONFIRMED', addMinutes(createdAt, 1), null]);
        history.push(['CONFIRMED', 'CANCELLED', cancelledAt!, patient.userId]);
      } else {
        history.push(['PENDING', 'CONFIRMED', addMinutes(createdAt, 1), null]);
        let previous: AppointmentStatus = 'CONFIRMED';
        if (checkedInAt) {
          history.push([previous, 'CHECKED_IN', checkedInAt, null]);
          previous = 'CHECKED_IN';
        }
        if (startedAt) {
          history.push([previous, 'IN_CONSULTATION', startedAt, doc.userId]);
          previous = 'IN_CONSULTATION';
        }
        if (completedAt) history.push([previous, 'COMPLETED', completedAt, doc.userId]);
        if (status === 'NO_SHOW') history.push(['CONFIRMED', 'NO_SHOW', addMinutes(slot.start, 30), doc.userId]);
      }
    }
    for (const [fromStatus, toStatus, when, changedById] of history) {
      rows.appointmentHistory.push({ id: randomUUID(), appointmentId: id, fromStatus, toStatus, changedById, createdAt: when });
    }

    const orgId = slot.organizationId;
    activity(ACTIVITY.APPOINTMENT_BOOKED, 'Appointment', id, `${patient.name} booked ${doc.name} (${orgName(orgId)})`, createdAt, patient.userId, orgId);
    if (status === 'CANCELLED') activity(ACTIVITY.APPOINTMENT_CANCELLED, 'Appointment', id, `${patient.name} cancelled an appointment with ${doc.name}`, cancelledAt!, patient.userId, orgId);

    // Payment (simulated)
    const method: PaymentMethod =
      input.paymentMethod ??
      (type === 'IN_PERSON' ? rng.weighted<PaymentMethod>([['PAY_AT_CLINIC', 4], ['UPI', 4], ['CARD', 2]]) : rng.weighted<PaymentMethod>([['UPI', 3], ['CARD', 2]]));
    const payAtClinic = method === 'PAY_AT_CLINIC';
    if (!(payAtClinic && (status === 'CANCELLED' || status === 'NO_SHOW'))) {
      const paymentStatus = payAtClinic ? (status === 'COMPLETED' ? 'PAID' : 'PENDING') : status === 'CANCELLED' ? 'REFUNDED' : 'PAID';
      addPayment({
        patientId: patient.id,
        purpose: 'APPOINTMENT',
        appointmentId: id,
        amount: fee,
        method,
        methodDetail: methodDetail(method, patient),
        status: paymentStatus,
        paidAt: paymentStatus === 'PENDING' ? null : payAtClinic ? completedAt : createdAt,
        refundedAt: paymentStatus === 'REFUNDED' ? cancelledAt : null,
        createdAt,
      });
    }

    // Consultation + prescription
    let prescription: PrescriptionRecord | undefined;
    if (status === 'COMPLETED' || status === 'IN_CONSULTATION') {
      const consultationId = randomUUID();
      rows.consultations.push({
        id: consultationId,
        appointmentId: id,
        doctorId: doc.id,
        patientId: patient.id,
        status: status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
        chiefComplaint: template.chiefComplaint,
        notes: status === 'COMPLETED' ? template.notes : null,
        diagnosis: status === 'COMPLETED' ? template.diagnosis : null,
        observations: template.observations,
        followUpDate: status === 'COMPLETED' && template.followUpDays ? new Date(slot.start.getTime() + template.followUpDays * 86_400_000) : null,
        startedAt: startedAt!,
        completedAt,
        createdAt: startedAt!,
      });
      activity(ACTIVITY.CONSULTATION_STARTED, 'Consultation', consultationId, `${doc.name} started a consultation with ${patient.name}`, startedAt!, doc.userId, orgId);

      if (status === 'COMPLETED') {
        activity(ACTIVITY.CONSULTATION_COMPLETED, 'Consultation', consultationId, `${doc.name} completed a consultation with ${patient.name}`, completedAt!, doc.userId, orgId);
        const withPrescription = input.withPrescription ?? rng.chance(0.8);
        if (withPrescription && template.items.length) {
          const prescriptionId = randomUUID();
          const issuedAt = addMinutes(completedAt!, -2);
          prescription = {
            row: {
              id: prescriptionId,
              prescriptionNumber: '',
              consultationId,
              doctorId: doc.id,
              patientId: patient.id,
              organizationId: orgId,
              status: 'ISSUED',
              diagnosis: template.diagnosis,
              advice: template.advice,
              issuedAt,
              validUntil: new Date(issuedAt.getTime() + 30 * 86_400_000),
              createdAt: startedAt!,
            },
            patient,
            doctor: doc,
            lines: template.items.map((item) => ({ medicineKey: item.medicine, quantity: item.quantity })),
            golden: input.golden,
          };
          template.items.forEach((item, sortOrder) => {
            rows.prescriptionItems.push({
              id: randomUUID(),
              prescriptionId,
              medicineId: medicineIds.get(item.medicine)!,
              medicineName: medicineByKey.get(item.medicine)!.name,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
              timing: item.timing,
              instructions: item.instructions,
              quantity: item.quantity,
              sortOrder,
              createdAt: issuedAt,
            });
          });
          rows.prescriptions.push(prescription);
        }
      }
    }

    return { id, prescription, createdAt, type, orgId };
  };

  // Reserve the golden slots first so random generation never takes them.
  const maya = doctor('maya-rao');
  const sunrise = org('sunrise');
  const goldenSlotToday = findSlot(maya, 0, '17:30');
  if (goldenSlotToday) bookedSlots.add(slotKey(maya.id, goldenSlotToday.start)); // kept free for the live demo

  // Rahul's own history
  const rahulFeverSlot = findSlot(doctor('arjun-mehta'), -120) ?? findSlot(doctor('arjun-mehta'), -119)!;
  const rahulFever = addAppointment({ patient: rahul, doc: doctor('arjun-mehta'), slot: rahulFeverSlot, status: 'COMPLETED', type: 'IN_PERSON', template: CLINICAL_TEMPLATES['general-physician'][0], paymentMethod: 'UPI', withPrescription: true });
  const rahulBackSlot = findSlot(doctor('rohan-kapoor'), -45) ?? findSlot(doctor('rohan-kapoor'), -44)!;
  const rahulBack = addAppointment({ patient: rahul, doc: doctor('rohan-kapoor'), slot: rahulBackSlot, status: 'COMPLETED', type: 'IN_PERSON', template: CLINICAL_TEMPLATES.orthopedic[0], paymentMethod: 'CARD', withPrescription: true });
  const nikhil = doctor('nikhil-bhat');
  const rahulCancelledSlot = findSlot(nikhil, -70) ?? findSlot(nikhil, -69);
  if (rahulCancelledSlot) addAppointment({ patient: rahul, doc: nikhil, slot: rahulCancelledSlot, status: 'CANCELLED', type: 'VIDEO', paymentMethod: 'UPI' });
  const karan = doctor('karan-patel');
  for (const offset of [6, 7, 8, 9]) {
    const slot = findSlot(karan, offset, '11:00') ?? findSlot(karan, offset);
    if (slot) {
      addAppointment({
        patient: rahul, doc: karan, slot, status: 'CONFIRMED', type: 'IN_PERSON',
        template: { ...CLINICAL_TEMPLATES.cardiologist[0], reason: 'Annual heart health check-up' },
        paymentMethod: 'UPI', createdAt: daysAgo(2, '19:40'),
      });
      break;
    }
  }

  // Golden appointment (complete mode): yesterday 11:00 with Dr. Maya Rao at Sunrise.
  let goldenPrescription: PrescriptionRecord | undefined;
  if (scenario === 'complete') {
    let goldenSlot: Slot | null = null;
    for (let offset = -1; offset >= -4 && !goldenSlot; offset--) {
      goldenSlot = findSlot(maya, offset, '11:00');
      if (goldenSlot && goldenSlot.organizationId !== sunrise.id) goldenSlot = null;
    }
    if (!goldenSlot) throw new Error('Could not find a golden appointment slot for Dr. Maya Rao');
    const golden = addAppointment({
      patient: rahul, doc: maya, slot: goldenSlot, status: 'COMPLETED', type: 'IN_PERSON',
      template: GOLDEN_CONSULTATION, paymentMethod: 'UPI', createdAt: addMinutes(goldenSlot.start, -60 * 20),
      golden: true, withPrescription: true,
    });
    goldenPrescription = golden.prescription;
  }

  // Historical appointments (recent-weighted for upward trend charts)
  const weightedDoctors: Array<readonly [DoctorRecord, number]> = approvedDoctors.map((d) => [d, d.seed.key === 'maya-rao' ? 5 : d.seed.key === 'arjun-mehta' ? 3 : 1] as const);
  let historical = 0;
  for (let attempt = 0; historical < 62 && attempt < 500; attempt++) {
    const dayOffset = -(1 + Math.floor(Math.pow(rng.next(), 1.5) * 150));
    const doc = rng.weighted(weightedDoctors);
    if (doc.seed.createdDaysAgo < -dayOffset + 2) continue;
    const eligible = otherPatients.filter((p) => p.seed.createdDaysAgo > -dayOffset + 3);
    if (!eligible.length) continue;
    const slot = findSlot(doc, dayOffset);
    if (!slot) continue;
    const status = rng.weighted<AppointmentStatus>([['COMPLETED', 84], ['CANCELLED', 10], ['NO_SHOW', 6]]);
    addAppointment({ patient: rng.pick(eligible), doc, slot, status });
    historical++;
  }

  // Today — statuses follow the clock so the doctor dashboard is believable at any hour.
  const todayStatus = (slot: Slot): AppointmentStatus => {
    const diffMinutes = (slot.start.getTime() - now.getTime()) / 60_000;
    if (diffMinutes < -60) return 'COMPLETED';
    if (diffMinutes < 45) return 'CHECKED_IN';
    return 'CONFIRMED';
  };
  const mayaToday = ['10:00', '11:00', '12:00', '14:30', '15:30', '16:30'];
  const todayPatients = rng.shuffle(otherPatients);
  let todayIndex = 0;
  for (const time of mayaToday) {
    const slot = findSlot(maya, 0, time);
    if (slot) addAppointment({ patient: todayPatients[todayIndex++ % todayPatients.length], doc: maya, slot, status: todayStatus(slot), createdAt: daysAgo(rng.int(1, 4), '20:00') });
  }
  for (const doc of rng.sample(approvedDoctors.filter((d) => d !== maya), 9)) {
    const slot = findSlot(doc, 0);
    if (!slot) continue;
    let status = todayStatus(slot);
    if (status === 'CHECKED_IN' && rng.chance(0.4)) status = 'IN_CONSULTATION';
    addAppointment({ patient: todayPatients[todayIndex++ % todayPatients.length], doc, slot, status, createdAt: daysAgo(rng.int(1, 4), '18:00') });
  }

  // Upcoming (next two weeks)
  let upcoming = 0;
  for (let attempt = 0; upcoming < 24 && attempt < 300; attempt++) {
    const dayOffset = rng.int(1, 14);
    const doc = rng.weighted(weightedDoctors);
    const slot = findSlot(doc, dayOffset);
    if (!slot) continue;
    addAppointment({ patient: rng.pick(otherPatients), doc, slot, status: rng.chance(0.8) ? 'CONFIRMED' : 'PENDING', createdAt: minutesAgo(rng.int(20, 60 * 24 * 4)) });
    upcoming++;
  }

  // Appointment numbers, in booking order
  rows.appointments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  rows.appointments.forEach((appointment, index) => {
    appointment.appointmentNumber = formatSequence('appointment', year, index + 1);
  });

  // Prescription numbers: seeded history ends at 124 so the golden one is RX-YYYY-00125.
  const historicPrescriptions = rows.prescriptions.filter((p) => !p.golden).sort((a, b) => a.row.issuedAt.getTime() - b.row.issuedAt.getTime());
  const firstRx = GOLDEN_RX_SEQUENCE - historicPrescriptions.length;
  if (firstRx < 1) throw new Error('Too many seeded prescriptions for the golden numbering scheme');
  historicPrescriptions.forEach((p, index) => {
    p.row.prescriptionNumber = formatSequence('prescription', year, firstRx + index);
  });
  if (goldenPrescription) goldenPrescription.row.prescriptionNumber = formatSequence('prescription', year, GOLDEN_RX_SEQUENCE);

  for (const p of rows.prescriptions) {
    activity(ACTIVITY.PRESCRIPTION_ISSUED, 'Prescription', p.row.id, `${p.doctor.name} issued ${p.row.prescriptionNumber} to ${p.patient.name}`, p.row.issuedAt, p.doctor.userId, p.row.organizationId ?? null);
  }

  // ── Orders ───────────────────────────────────────────────
  const citycare = org('citycare');
  const medpoint = org('medpoint');
  const otcKeys = MEDICINES.filter((medicine) => !medicine.requiresPrescription).map((medicine) => medicine.key);
  const stockedAt = (pharmacy: OrgRecord, key: string) => (inventory.get(pharmacy.id)?.get(key)?.stock ?? 0) > 0;
  const pickOtcLines = (pharmacy: OrgRecord, count: number) =>
    rng.sample(otcKeys.filter((key) => stockedAt(pharmacy, key)), count).map((key) => ({ medicineKey: key, quantity: rng.weighted([[1, 6], [2, 3], [3, 1]] as const) }));
  const bestPharmacyFor = (prescription: PrescriptionRecord, preferred?: OrgRecord) => {
    const candidates = preferred ? [preferred, ...approvedPharmacies.filter((p) => p !== preferred)] : rng.shuffle(approvedPharmacies);
    return candidates.find((pharmacy) => prescription.lines.every((line) => stockedAt(pharmacy, line.medicineKey))) ?? candidates[0];
  };
  const preferredPharmacy = (patient: PatientRecord) => {
    const preferredId = rows.patients.find((p) => p.id === patient.id)?.preferredPharmacyId;
    return approvedPharmacies.find((pharmacy) => pharmacy.id === preferredId);
  };

  const orderSpecs: OrderSpec[] = [];

  // Rahul's history: City Care (fever Rx) and MedPoint (back-pain Rx), both delivered.
  if (rahulFever.prescription) {
    orderSpecs.push({ patient: rahul, pharmacy: citycare, prescription: rahulFever.prescription, lines: rahulFever.prescription.lines, placedAt: addMinutes(rahulFever.prescription.row.issuedAt, 40), status: 'DELIVERED', fulfillmentType: 'DELIVERY', paymentMethod: 'UPI' });
  }
  if (rahulBack.prescription) {
    orderSpecs.push({ patient: rahul, pharmacy: medpoint, prescription: rahulBack.prescription, lines: rahulBack.prescription.lines, placedAt: addMinutes(rahulBack.prescription.row.issuedAt, 55), status: 'DELIVERED', fulfillmentType: 'DELIVERY', paymentMethod: 'CARD' });
  }

  // Active orders — populate every pharmacy dashboard column.
  const recentPrescriptions = historicPrescriptions.filter((p) => p.patient !== rahul && now.getTime() - p.row.issuedAt.getTime() < 10 * 86_400_000);
  const active: Array<{ pharmacy: OrgRecord; status: OrderStatus; rx?: boolean; pickup?: boolean; patient?: PatientRecord; lines?: OrderSpec['lines'] }> = [
    { pharmacy: citycare, status: 'PENDING' },
    { pharmacy: citycare, status: 'PENDING', rx: true },
    { pharmacy: citycare, status: 'PRESCRIPTION_REVIEW', rx: true },
    { pharmacy: citycare, status: 'CONFIRMED' },
    { pharmacy: citycare, status: 'PREPARING', rx: true },
    { pharmacy: citycare, status: 'PREPARING' },
    { pharmacy: citycare, status: 'READY_FOR_PICKUP', pickup: true },
    { pharmacy: citycare, status: 'OUT_FOR_DELIVERY' },
    { pharmacy: medpoint, status: 'OUT_FOR_DELIVERY', patient: rahul, lines: [{ medicineKey: 'vitd3-2000', quantity: 1 }, { medicineKey: 'omega3', quantity: 1 }, { medicineKey: 'multivitamin', quantity: 1 }] },
    { pharmacy: medpoint, status: 'PENDING' },
    { pharmacy: medpoint, status: 'PREPARING', rx: true },
    { pharmacy: org('healthfirst'), status: 'CONFIRMED' },
    { pharmacy: org('healthfirst'), status: 'PRESCRIPTION_REVIEW', rx: true },
    { pharmacy: org('greencross'), status: 'PENDING' },
  ];
  const usedPrescriptions = new Set<string>([rahulFever.prescription?.row.id, rahulBack.prescription?.row.id].filter(Boolean) as string[]);
  active.forEach((spec, index) => {
    let prescription: PrescriptionRecord | undefined;
    if (spec.rx) {
      prescription = recentPrescriptions.find((p) => !usedPrescriptions.has(p.row.id) && p.lines.every((line) => stockedAt(spec.pharmacy, line.medicineKey)));
      if (prescription) usedPrescriptions.add(prescription.row.id);
    }
    const patient = spec.patient ?? prescription?.patient ?? otherPatients[(index * 7) % otherPatients.length];
    let lines = spec.lines ?? prescription?.lines ?? pickOtcLines(spec.pharmacy, rng.int(1, 4));
    let uploadedDocumentId: string | undefined;
    if (spec.rx && !prescription) {
      // No matching in-app prescription: the patient uploaded a paper prescription instead.
      const rxKey = rng.pick(MEDICINES.filter((m) => m.requiresPrescription && stockedAt(spec.pharmacy, m.key))).key;
      lines = [{ medicineKey: rxKey, quantity: 1 }, ...pickOtcLines(spec.pharmacy, 1)];
      uploadedDocumentId = randomUUID();
      rows.documents.push({
        id: uploadedDocumentId, uploadedById: patient.userId, patientId: patient.id, type: 'PRESCRIPTION',
        title: 'Uploaded prescription', fileName: 'scanned-prescription.jpg', mimeType: 'image/jpeg',
        sizeBytes: rng.int(250_000, 800_000), storageUrl: '/demo/documents/scanned-prescription.jpg', createdAt: minutesAgo(20 + index * 11),
      });
    }
    orderSpecs.push({
      patient,
      pharmacy: spec.pharmacy,
      prescription,
      uploadedDocumentId,
      lines,
      placedAt: minutesAgo(15 + index * 11 + rng.int(0, 8)),
      status: spec.status,
      fulfillmentType: spec.pickup ? 'PICKUP' : 'DELIVERY',
      paymentMethod: rng.weighted<PaymentMethod>([['UPI', 4], ['CARD', 2], ['CASH_ON_DELIVERY', spec.pickup ? 0 : 3]]),
    });
  });

  // Historic OTC orders
  for (let i = 0; i < 7; i++) {
    const pharmacy = rng.pick(approvedPharmacies);
    const patient = rng.pick(otherPatients);
    const daysBack = 1 + Math.floor(Math.pow(rng.next(), 1.4) * Math.min(120, patient.seed.createdDaysAgo - 1));
    orderSpecs.push({
      patient, pharmacy, lines: pickOtcLines(pharmacy, rng.int(1, 4)),
      placedAt: daysAgo(daysBack, `${rng.int(9, 21)}:${rng.pick(['05', '20', '35', '50'])}`),
      status: rng.weighted<OrderStatus>([['DELIVERED', 9], ['CANCELLED', 1]]),
      fulfillmentType: rng.chance(0.85) ? 'DELIVERY' : 'PICKUP',
      paymentMethod: rng.weighted<PaymentMethod>([['UPI', 4], ['CARD', 2], ['CASH_ON_DELIVERY', 3]]),
    });
  }

  // Historic prescription orders fill the rest, so seeded orders end at GOLDEN_ORDER_SEQUENCE - 1.
  const targetHistoricOrders = GOLDEN_ORDER_SEQUENCE - 1;
  const rxCandidates = rng.shuffle(historicPrescriptions.filter((p) => !usedPrescriptions.has(p.row.id) && now.getTime() - p.row.issuedAt.getTime() > 2 * 86_400_000));
  for (const prescription of rxCandidates) {
    if (orderSpecs.length >= targetHistoricOrders) break;
    const pharmacy = bestPharmacyFor(prescription, preferredPharmacy(prescription.patient));
    const extra = rng.chance(0.3) ? pickOtcLines(pharmacy, 1).filter((line) => !prescription.lines.some((l) => l.medicineKey === line.medicineKey)) : [];
    const outcome = rng.weighted<OrderStatus>([['DELIVERED', 17], ['CANCELLED', 1], ['REJECTED', 1.2]]);
    orderSpecs.push({
      patient: prescription.patient, pharmacy, prescription,
      lines: [...prescription.lines, ...extra],
      placedAt: addMinutes(prescription.row.issuedAt, rng.int(20, 240)),
      status: outcome,
      fulfillmentType: rng.chance(0.85) ? 'DELIVERY' : 'PICKUP',
      paymentMethod: rng.weighted<PaymentMethod>([['UPI', 4], ['CARD', 2], ['CASH_ON_DELIVERY', 3]]),
      rejectionReason: outcome === 'REJECTED' ? 'Prescription image was unclear. Please upload a clearer copy.' : undefined,
    });
  }

  // Golden order (complete mode): City Care, delivered yesterday.
  if (goldenPrescription) {
    orderSpecs.push({
      patient: rahul, pharmacy: citycare, prescription: goldenPrescription, lines: goldenPrescription.lines,
      placedAt: addMinutes(goldenPrescription.row.issuedAt, 45), status: 'DELIVERED', fulfillmentType: 'DELIVERY',
      paymentMethod: 'UPI', golden: true,
    });
  }

  const deliveryPath = (fulfillment: FulfillmentType, rx: boolean): OrderStatus[] => [
    'PENDING',
    ...(rx ? (['PRESCRIPTION_REVIEW'] as OrderStatus[]) : []),
    'CONFIRMED',
    'PREPARING',
    fulfillment === 'DELIVERY' ? 'OUT_FOR_DELIVERY' : 'READY_FOR_PICKUP',
    'DELIVERED',
  ];
  const STEP_MINUTES: Partial<Record<OrderStatus, number>> = { PRESCRIPTION_REVIEW: 6, CONFIRMED: 6, PREPARING: 7, OUT_FOR_DELIVERY: 14, READY_FOR_PICKUP: 14 };

  const historicSpecs = orderSpecs.filter((spec) => !spec.golden).sort((a, b) => a.placedAt.getTime() - b.placedAt.getTime());
  const firstOrder = GOLDEN_ORDER_SEQUENCE - historicSpecs.length;
  if (firstOrder < 1) throw new Error('Too many seeded orders for the golden numbering scheme');
  const orderNumberFor = new Map<OrderSpec, string>();
  historicSpecs.forEach((spec, index) => orderNumberFor.set(spec, formatSequence('order', year, firstOrder + index)));
  const goldenSpec = orderSpecs.find((spec) => spec.golden);
  if (goldenSpec) orderNumberFor.set(goldenSpec, formatSequence('order', year, GOLDEN_ORDER_SEQUENCE));

  const deliveredOrders: Array<{ id: string; spec: OrderSpec; deliveredAt: Date }> = [];

  for (const spec of orderSpecs) {
    const id = randomUUID();
    const orderNumber = orderNumberFor.get(spec)!;
    const pharmacySeed = spec.pharmacy.seed.pharmacy!;
    const stock = inventory.get(spec.pharmacy.id)!;
    const lines = spec.lines.filter((line) => stock.has(line.medicineKey));
    if (!lines.length) lines.push(...pickOtcLines(spec.pharmacy, 1));

    let subtotalMrp = 0;
    let itemsTotal = 0;
    for (const line of lines) {
      const entry = stock.get(line.medicineKey)!;
      const medicine = medicineByKey.get(line.medicineKey)!;
      subtotalMrp += entry.mrp * line.quantity;
      itemsTotal += entry.sellingPrice * line.quantity;
      rows.orderItems.push({
        id: randomUUID(),
        orderId: id,
        medicineId: medicineIds.get(line.medicineKey)!,
        medicineName: medicine.name,
        packSize: medicine.packSize,
        requiresPrescription: medicine.requiresPrescription,
        quantity: line.quantity,
        approvedQuantity: ['PENDING', 'PRESCRIPTION_REVIEW', 'CANCELLED', 'REJECTED'].includes(spec.status) ? null : line.quantity,
        unitMrp: entry.mrp,
        unitPrice: entry.sellingPrice,
        lineTotal: round2(entry.sellingPrice * line.quantity),
        createdAt: spec.placedAt,
      });
    }
    const deliveryFee = spec.fulfillmentType === 'DELIVERY' && itemsTotal < pharmacySeed.freeDeliveryAbove ? pharmacySeed.deliveryFee : 0;
    const total = round2(itemsTotal + deliveryFee + PLATFORM_FEE);

    // Status timeline
    const rx = Boolean(spec.prescription) || lines.some((line) => medicineByKey.get(line.medicineKey)!.requiresPrescription);
    const timeline: Array<[OrderStatus | null, OrderStatus, Date, string | null, string | null]> = [];
    let cursor = spec.placedAt;
    timeline.push([null, 'PENDING', cursor, spec.patient.userId, null]);
    const pharmacyActor = spec.pharmacy.staffUserIds[0] ?? spec.pharmacy.adminUserId;
    const deliveryMinutes = rng.int(pharmacySeed.etaMin, pharmacySeed.etaMax) - 20;

    if (spec.status === 'CANCELLED') {
      timeline.push(['PENDING', 'CANCELLED', addMinutes(cursor, rng.int(3, 20)), spec.patient.userId, 'Cancelled by customer']);
    } else if (spec.status === 'REJECTED') {
      cursor = addMinutes(cursor, 6);
      timeline.push(['PENDING', 'PRESCRIPTION_REVIEW', cursor, pharmacyActor, null]);
      timeline.push(['PRESCRIPTION_REVIEW', 'REJECTED', addMinutes(cursor, 9), pharmacyActor, spec.rejectionReason ?? 'Unable to fulfil this order']);
    } else {
      const path = deliveryPath(spec.fulfillmentType, rx);
      const target = path.indexOf(spec.status);
      for (let i = 1; i <= target; i++) {
        const status = path[i];
        cursor = addMinutes(cursor, status === 'DELIVERED' ? Math.max(8, deliveryMinutes) : STEP_MINUTES[status] ?? 6);
        timeline.push([path[i - 1], status, cursor, status === 'DELIVERED' && spec.fulfillmentType === 'DELIVERY' ? null : pharmacyActor, null]);
      }
    }
    // Active orders must not have future timestamps.
    const lastAt = timeline[timeline.length - 1][2];
    if (lastAt > now) {
      const shift = lastAt.getTime() - now.getTime() + 60_000 * rng.int(2, 6);
      for (const entry of timeline) entry[2] = new Date(entry[2].getTime() - shift);
    }
    const placedAt = timeline[0][2];
    const whenStatus = (status: OrderStatus) => timeline.find((entry) => entry[1] === status)?.[2] ?? null;
    const confirmedAt = whenStatus('CONFIRMED');
    const deliveredAt = whenStatus('DELIVERED');
    const cancelledAt = whenStatus('CANCELLED') ?? whenStatus('REJECTED');

    const address = spec.patient.homeAddress;
    rows.orders.push({
      id,
      orderNumber,
      patientId: spec.patient.id,
      pharmacyId: spec.pharmacy.id,
      prescriptionId: spec.prescription?.row.id,
      uploadedDocumentId: spec.uploadedDocumentId,
      addressId: spec.fulfillmentType === 'DELIVERY' ? address.id : null,
      status: spec.status,
      fulfillmentType: spec.fulfillmentType,
      ...(spec.fulfillmentType === 'DELIVERY'
        ? { deliveryRecipient: address.recipient, deliveryPhone: address.phone, deliveryLine1: address.line1, deliveryLine2: address.line2, deliveryLocality: address.locality, deliveryCity: address.city, deliveryPostalCode: address.postalCode }
        : {}),
      subtotalMrp: round2(subtotalMrp),
      discountTotal: round2(subtotalMrp - itemsTotal),
      deliveryFee,
      platformFee: PLATFORM_FEE,
      totalAmount: total,
      paymentMethod: spec.paymentMethod,
      rejectionReason: spec.status === 'REJECTED' ? spec.rejectionReason : null,
      placedAt,
      confirmedAt,
      deliveredAt,
      cancelledAt,
      estimatedDeliveryAt: spec.fulfillmentType === 'DELIVERY' ? addMinutes(placedAt, pharmacySeed.etaMax) : null,
      createdAt: placedAt,
      updatedAt: timeline[timeline.length - 1][2],
    });
    for (const [fromStatus, toStatus, when, changedById, note] of timeline) {
      rows.orderHistory.push({ id: randomUUID(), orderId: id, fromStatus, toStatus, changedById, note, createdAt: when });
    }

    // Payment
    const online = spec.paymentMethod !== 'CASH_ON_DELIVERY';
    const terminal = spec.status === 'CANCELLED' || spec.status === 'REJECTED';
    if (online || !terminal) {
      addPayment({
        patientId: spec.patient.id,
        purpose: 'ORDER',
        orderId: id,
        amount: total,
        method: spec.paymentMethod,
        methodDetail: methodDetail(spec.paymentMethod, spec.patient),
        status: online ? (terminal ? 'REFUNDED' : 'PAID') : deliveredAt ? 'PAID' : 'PENDING',
        paidAt: online ? placedAt : deliveredAt,
        refundedAt: online && terminal ? cancelledAt : null,
        createdAt: placedAt,
      });
    }

    // Simulated delivery
    const outAt = whenStatus('OUT_FOR_DELIVERY');
    if (spec.fulfillmentType === 'DELIVERY' && outAt) {
      const deliveryId = randomUUID();
      const agent = spec.golden ? DELIVERY_AGENTS[0] : rng.pick(DELIVERY_AGENTS);
      const assignedAt = addMinutes(whenStatus('PREPARING') ?? outAt, 3);
      const pickedUpAt = outAt;
      const onTheWayAt = addMinutes(outAt, 2);
      const deliveryStatus = deliveredAt ? 'DELIVERED' : 'ON_THE_WAY';
      rows.deliveries.push({
        id: deliveryId,
        orderId: id,
        agentName: agent.name,
        agentPhone: agent.phone,
        vehicleType: agent.vehicleType,
        vehicleNumber: agent.vehicleNumber,
        status: deliveryStatus,
        estimatedArrivalAt: deliveredAt ?? addMinutes(outAt, Math.max(12, deliveryMinutes)),
        assignedAt,
        pickedUpAt,
        deliveredAt,
        createdAt: assignedAt,
      });
      const steps: Array<[typeof deliveryStatus | 'ASSIGNED' | 'PICKED_UP', Date]> = [['ASSIGNED', assignedAt], ['PICKED_UP', pickedUpAt], ['ON_THE_WAY', onTheWayAt]];
      if (deliveredAt) steps.push(['DELIVERED', deliveredAt]);
      for (const [status, when] of steps) rows.deliveryHistory.push({ id: randomUUID(), deliveryId, status, createdAt: when });
    }

    // Activity + notifications
    const pharmacyName = spec.pharmacy.seed.name;
    const pharmacyRecipients = [spec.pharmacy.adminUserId, ...spec.pharmacy.staffUserIds];
    activity(ACTIVITY.ORDER_CREATED, 'Order', id, `${spec.patient.name} placed ${orderNumber} with ${pharmacyName}`, placedAt, spec.patient.userId, spec.pharmacy.id);
    if (confirmedAt) activity(ACTIVITY.ORDER_ACCEPTED, 'Order', id, `${pharmacyName} accepted ${orderNumber}`, confirmedAt, pharmacyActor, spec.pharmacy.id);
    if (spec.status === 'REJECTED') activity(ACTIVITY.ORDER_REJECTED, 'Order', id, `${pharmacyName} rejected ${orderNumber}`, cancelledAt!, pharmacyActor, spec.pharmacy.id);
    if (outAt) activity(ACTIVITY.ORDER_DISPATCHED, 'Order', id, `${orderNumber} is out for delivery`, outAt, pharmacyActor, spec.pharmacy.id);
    if (deliveredAt) {
      activity(ACTIVITY.ORDER_DELIVERED, 'Order', id, `${orderNumber} was delivered to ${spec.patient.name}`, deliveredAt, null, spec.pharmacy.id);
      deliveredOrders.push({ id, spec, deliveredAt });
    }

    const recent = now.getTime() - placedAt.getTime() < 3 * 86_400_000;
    if (recent || spec.patient === rahul) {
      const link = `/orders/${id}`;
      const entity = { type: 'Order', id };
      if (spec.status === 'PENDING' || spec.status === 'PRESCRIPTION_REVIEW' || recent) {
        for (const recipient of pharmacyRecipients) {
          notify(recipient, 'ORDER_PLACED', 'New order received', `${orderNumber} from ${spec.patient.name} — ${lines.length} item(s).`, placedAt, `/pharmacy/orders/${id}`, entity);
        }
      }
      if (spec.status === 'PRESCRIPTION_REVIEW') {
        for (const recipient of pharmacyRecipients) {
          notify(recipient, 'ORDER_PRESCRIPTION_REVIEW', 'Prescription awaiting review', `${orderNumber} needs prescription verification.`, whenStatus('PRESCRIPTION_REVIEW')!, `/pharmacy/orders/${id}`, entity);
        }
      }
      if (confirmedAt) notify(spec.patient.userId, 'ORDER_ACCEPTED', 'Order accepted', `${pharmacyName} accepted your order ${orderNumber}.`, confirmedAt, link, entity);
      if (outAt) notify(spec.patient.userId, 'ORDER_DISPATCHED', 'Order out for delivery', `${orderNumber} is on the way.`, outAt, link, entity);
      if (deliveredAt) notify(spec.patient.userId, 'ORDER_DELIVERED', 'Order delivered', `${orderNumber} was delivered. Get well soon!`, deliveredAt, link, entity);
    }
  }

  // ── Notifications for appointments & prescriptions ──────
  for (const appointment of rows.appointments) {
    const patient = patients.find((p) => p.id === appointment.patientId)!;
    const doc = [...doctors.values()].find((d) => d.id === appointment.doctorId)!;
    const start = appointment.scheduledStart as Date;
    const isUpcoming = start > now;
    const isRecent = now.getTime() - appointment.createdAt.getTime() < 5 * 86_400_000;
    const when = start.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    const entity = { type: 'Appointment', id: appointment.id };

    if ((isUpcoming || isRecent) && appointment.status !== 'CANCELLED') {
      notify(doc.userId, 'APPOINTMENT_BOOKED', 'New appointment', `${patient.name} booked ${when}.`, appointment.createdAt, `/doctor/appointments/${appointment.id}`, entity);
      if (appointment.organizationId && (doc === maya || rng.chance(0.4))) {
        const orgRecord = [...orgs.values()].find((o) => o.id === appointment.organizationId)!;
        notify(orgRecord.adminUserId, 'APPOINTMENT_BOOKED', 'New appointment', `${patient.name} booked ${doc.name} for ${when}.`, appointment.createdAt, '/organization/appointments', entity);
      }
    }
    if (isUpcoming && (patient === rahul || rng.chance(0.5))) {
      notify(patient.userId, 'APPOINTMENT_CONFIRMED', 'Appointment confirmed', `Your appointment with ${doc.name} on ${when} is confirmed.`, addMinutes(appointment.createdAt, 1), `/appointments/${appointment.id}`, entity);
      if (start.getTime() - now.getTime() < 7 * 86_400_000) {
        notify(patient.userId, 'APPOINTMENT_REMINDER', 'Upcoming appointment', `Reminder: ${doc.name} on ${when}.`, minutesAgo(rng.int(30, 300)), `/appointments/${appointment.id}`, entity);
      }
    }
    if (appointment.status === 'CANCELLED' && isRecent) {
      notify(doc.userId, 'APPOINTMENT_CANCELLED', 'Appointment cancelled', `${patient.name} cancelled the appointment on ${when}.`, appointment.cancelledAt as Date, `/doctor/appointments/${appointment.id}`, entity);
    }
  }
  for (const p of rows.prescriptions) {
    if (p.patient === rahul || now.getTime() - p.row.issuedAt.getTime() < 7 * 86_400_000) {
      notify(p.patient.userId, 'PRESCRIPTION_ISSUED', 'New prescription', `${p.doctor.name} issued prescription ${p.row.prescriptionNumber}.`, p.row.issuedAt, `/prescriptions/${p.row.id}`, { type: 'Prescription', id: p.row.id });
    }
  }

  // ── Lab bookings ─────────────────────────────────────────
  const labPlans: Array<{ patient: PatientRecord; codes: string[]; dayOffset: number; status: Prisma.LabBookingCreateManyInput['status'] }> = [
    { patient: rahul, codes: ['VITD'], dayOffset: -40, status: 'REPORT_READY' },
    { patient: rahul, codes: ['LIP'], dayOffset: 3, status: 'BOOKED' },
  ];
  const labStatuses: Array<[number, Prisma.LabBookingCreateManyInput['status']]> = [
    [-60, 'REPORT_READY'], [-35, 'REPORT_READY'], [-21, 'REPORT_READY'], [-12, 'REPORT_READY'], [-6, 'REPORT_READY'],
    [-9, 'CANCELLED'], [-1, 'PROCESSING'], [0, 'SAMPLE_COLLECTED'], [0, 'SAMPLE_COLLECTED'], [1, 'BOOKED'], [2, 'BOOKED'], [5, 'BOOKED'],
  ];
  const testCodes = LAB_TESTS.map((test) => test.code);
  for (const [dayOffset, status] of labStatuses) {
    const patient = rng.pick(otherPatients.filter((p) => p.seed.createdDaysAgo > -dayOffset + 3));
    labPlans.push({ patient, codes: rng.sample(testCodes, rng.chance(0.3) ? 2 : 1), dayOffset, status });
  }
  labPlans.forEach((plan) => {
    const id = randomUUID();
    const createdAt = addMinutes(at(plan.dayOffset, '07:00'), -60 * 24 * rng.int(1, 3));
    const bookedAt = createdAt > now ? minutesAgo(rng.int(60, 600)) : createdAt;
    const tests = plan.codes.map((code) => LAB_TESTS.find((test) => test.code === code)!);
    const total = tests.reduce((sum, test) => sum + test.price, 0);
    let reportDocumentId: string | null = null;
    if (plan.status === 'REPORT_READY') {
      reportDocumentId = randomUUID();
      rows.documents.push({
        id: reportDocumentId, uploadedById: plan.patient.userId, patientId: plan.patient.id, type: 'LAB_REPORT',
        title: `${tests.map((test) => test.name).join(' + ')} — Report`, fileName: 'sample-lab-report.pdf', mimeType: 'application/pdf',
        sizeBytes: rng.int(120_000, 450_000), storageUrl: '/demo/documents/sample-lab-report.pdf', recordDate: istDate(plan.dayOffset + 1, now),
        notes: 'Sample report generated for demonstration.', createdAt: at(plan.dayOffset + 1, '18:00'),
      });
      notify(plan.patient.userId, 'LAB_REPORT_READY', 'Lab report ready', `Your ${tests[0].name} report is available in Health Records.`, at(plan.dayOffset + 1, '18:00'), '/health-records', { type: 'LabBooking', id });
    }
    rows.labBookings.push({
      id, bookingNumber: '', patientId: plan.patient.id, addressId: plan.patient.homeAddress.id, collectionType: 'HOME_COLLECTION',
      scheduledDate: istDate(plan.dayOffset, now), timeSlot: rng.pick(LAB_TIME_SLOTS), status: plan.status, totalAmount: total, reportDocumentId,
      createdAt: bookedAt,
    });
    tests.forEach((test) => rows.labBookingItems.push({ id: randomUUID(), labBookingId: id, labTestId: labTestIds.get(test.code)!, price: test.price }));
    const method = rng.weighted<PaymentMethod>([['UPI', 3], ['CARD', 2]]);
    addPayment({
      patientId: plan.patient.id, purpose: 'LAB_BOOKING', labBookingId: id, amount: total, method, methodDetail: methodDetail(method, plan.patient),
      status: plan.status === 'CANCELLED' ? 'REFUNDED' : 'PAID', paidAt: bookedAt, refundedAt: plan.status === 'CANCELLED' ? addMinutes(bookedAt, 300) : null, createdAt: bookedAt,
    });
    activity(ACTIVITY.LAB_BOOKING_CREATED, 'LabBooking', id, `${plan.patient.name} booked ${tests.map((t) => t.name).join(', ')}`, bookedAt, plan.patient.userId);
    if (plan.status === 'BOOKED') {
      notify(plan.patient.userId, 'LAB_BOOKING_CONFIRMED', 'Lab test booked', `${tests[0].name} home collection is scheduled.`, bookedAt, '/lab-bookings', { type: 'LabBooking', id });
    }
  });
  rows.labBookings.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  rows.labBookings.forEach((booking, index) => {
    booking.bookingNumber = formatSequence('labBooking', year, index + 1);
  });

  // ── Patient documents (mock uploads) ─────────────────────
  rows.documents.push(
    { id: randomUUID(), uploadedById: rahul.userId, patientId: rahul.id, type: 'PRESCRIPTION', title: 'Old prescription — Dr. S. Rao (scanned)', fileName: 'scanned-prescription.jpg', mimeType: 'image/jpeg', sizeBytes: 412_332, storageUrl: '/demo/documents/scanned-prescription.jpg', recordDate: istDate(-210, now), createdAt: daysAgo(140) },
    { id: randomUUID(), uploadedById: rahul.userId, patientId: rahul.id, type: 'MEDICAL_REPORT', title: 'Annual health checkup summary 2025', fileName: 'health-checkup-summary.pdf', mimeType: 'application/pdf', sizeBytes: 689_120, storageUrl: '/demo/documents/health-checkup-summary.pdf', recordDate: istDate(-260, now), createdAt: daysAgo(138) },
    { id: randomUUID(), uploadedById: rahul.userId, patientId: rahul.id, type: 'INSURANCE', title: 'Health insurance card', fileName: 'insurance-card.png', mimeType: 'image/png', sizeBytes: 220_450, storageUrl: '/demo/documents/insurance-card.png', createdAt: daysAgo(135) },
  );
  for (const patient of rng.sample(otherPatients, 8)) {
    const [type, title, fileName, mimeType] = rng.pick([
      ['LAB_REPORT', 'Blood test report', 'sample-lab-report.pdf', 'application/pdf'],
      ['PRESCRIPTION', 'Prescription from previous doctor', 'scanned-prescription.jpg', 'image/jpeg'],
      ['MEDICAL_REPORT', 'X-ray report', 'health-checkup-summary.pdf', 'application/pdf'],
      ['DISCHARGE_SUMMARY', 'Hospital discharge summary', 'health-checkup-summary.pdf', 'application/pdf'],
    ] as const);
    const created = daysAgo(rng.int(3, Math.max(4, patient.seed.createdDaysAgo - 1)));
    rows.documents.push({ id: randomUUID(), uploadedById: patient.userId, patientId: patient.id, type, title, fileName, mimeType, sizeBytes: rng.int(100_000, 900_000), storageUrl: `/demo/documents/${fileName}`, recordDate: istDate(-rng.int(10, 300), now), createdAt: created });
  }

  // ── Reviews (aggregates are computed from approved reviews) ──
  const reviewKeys = new Set<string>();
  const addReview = (input: { patient: PatientRecord; doctorId?: string; organizationId?: string; rating: number; comments: Record<number, string[]>; createdAt: Date; appointmentId?: string; orderId?: string; status?: Prisma.ReviewCreateManyInput['status'] }) => {
    const key = `${input.patient.id}|${input.doctorId ?? input.organizationId}`;
    if (reviewKeys.has(key)) return;
    reviewKeys.add(key);
    rows.reviews.push({
      id: randomUUID(),
      patientId: input.patient.id,
      doctorId: input.doctorId,
      organizationId: input.organizationId,
      appointmentId: input.appointmentId,
      orderId: input.orderId,
      rating: input.rating,
      comment: rng.pick(input.comments[input.rating] ?? input.comments[5]),
      status: input.status ?? (rng.chance(0.9) ? 'APPROVED' : 'PENDING'),
      createdAt: input.createdAt,
    });
  };
  const randomRating = () => rng.weighted([[5, 55], [4, 35], [3, 10]] as const);

  // Dr. Maya Rao's reviews are curated to show 4.8.
  [5, 5, 5, 4, 5].forEach((rating, index) => {
    addReview({ patient: otherPatients[index * 3], doctorId: maya.id, rating, comments: DOCTOR_REVIEW_COMMENTS, createdAt: daysAgo(10 + index * 17), status: 'APPROVED' });
  });
  for (const appointment of rows.appointments) {
    if (appointment.status !== 'COMPLETED' || !rng.chance(0.4)) continue;
    const patient = patients.find((p) => p.id === appointment.patientId)!;
    if (patient === rahul) continue;
    const createdAt = addMinutes(appointment.completedAt as Date, rng.int(60, 60 * 48));
    if (createdAt > now) continue;
    if (appointment.doctorId !== maya.id) addReview({ patient, doctorId: appointment.doctorId, rating: randomRating(), comments: DOCTOR_REVIEW_COMMENTS, createdAt, appointmentId: appointment.id });
    if (appointment.organizationId && rng.chance(0.4)) addReview({ patient, organizationId: appointment.organizationId, rating: randomRating(), comments: ORG_REVIEW_COMMENTS, createdAt, appointmentId: appointment.id });
  }
  for (const order of deliveredOrders) {
    if (order.spec.patient === rahul || !rng.chance(0.45)) continue;
    addReview({ patient: order.spec.patient, organizationId: order.spec.pharmacy.id, rating: randomRating(), comments: PHARMACY_REVIEW_COMMENTS, createdAt: addMinutes(order.deliveredAt, rng.int(30, 600)), orderId: order.id });
  }
  // Rahul reviewed his earlier doctors and City Care.
  addReview({ patient: rahul, doctorId: doctor('arjun-mehta').id, rating: 5, comments: DOCTOR_REVIEW_COMMENTS, createdAt: daysAgo(118), appointmentId: rahulFever.id, status: 'APPROVED' });
  addReview({ patient: rahul, organizationId: citycare.id, rating: 5, comments: PHARMACY_REVIEW_COMMENTS, createdAt: daysAgo(117), status: 'APPROVED' });
  // Every approved provider gets at least two approved reviews so listing cards never show "0.0".
  const ensureReviews = (target: { doctorId?: string; organizationId?: string }, comments: Record<number, string[]>) => {
    const count = () => rows.reviews.filter((r) => r.status === 'APPROVED' && (target.doctorId ? r.doctorId === target.doctorId : r.organizationId === target.organizationId)).length;
    for (let guard = 0; count() < 2 && guard < 20; guard++) {
      addReview({ patient: rng.pick(otherPatients), ...target, rating: rng.weighted([[5, 6], [4, 4]] as const), comments, createdAt: daysAgo(rng.int(5, 80)), status: 'APPROVED' });
    }
  };
  approvedDoctors.forEach((d) => ensureReviews({ doctorId: d.id }, DOCTOR_REVIEW_COMMENTS));
  approvedOrgs.forEach((o) => ensureReviews({ organizationId: o.id }, o.seed.type === 'PHARMACY' ? PHARMACY_REVIEW_COMMENTS : ORG_REVIEW_COMMENTS));
  const rejectedReview = rows.reviews.find((r) => r.rating === 3);
  if (rejectedReview) rejectedReview.status = 'REJECTED';

  const aggregate = (filter: (review: Prisma.ReviewCreateManyInput) => boolean) => {
    const approved = rows.reviews.filter((review) => review.status === 'APPROVED' && filter(review));
    const avg = approved.length ? approved.reduce((sum, review) => sum + review.rating, 0) / approved.length : 0;
    return { avgRating: Math.round(avg * 10) / 10, reviewCount: approved.length };
  };
  for (const row of rows.doctors) Object.assign(row, aggregate((review) => review.doctorId === row.id));
  for (const row of rows.organizations) Object.assign(row, aggregate((review) => review.organizationId === row.id));
  for (const review of rows.reviews) {
    const target = review.doctorId ? [...doctors.values()].find((d) => d.id === review.doctorId)!.name : [...orgs.values()].find((o) => o.id === review.organizationId)!.seed.name;
    const patient = patients.find((p) => p.id === review.patientId)!;
    activity(ACTIVITY.REVIEW_SUBMITTED, 'Review', review.id!, `${patient.name} rated ${target} ${review.rating}★`, review.createdAt as Date, patient.userId, review.organizationId ?? null);
  }

  // ── Favorites ────────────────────────────────────────────
  const favoriteKeys = new Set<string>();
  const addFavorite = (patient: PatientRecord, target: { doctorId?: string; organizationId?: string }, createdAt: Date) => {
    const key = `${patient.id}|${target.doctorId ?? target.organizationId}`;
    if (favoriteKeys.has(key)) return;
    favoriteKeys.add(key);
    rows.favorites.push({ id: randomUUID(), patientId: patient.id, ...target, createdAt });
  };
  addFavorite(rahul, { doctorId: maya.id }, daysAgo(100));
  addFavorite(rahul, { doctorId: doctor('arjun-mehta').id }, daysAgo(118));
  addFavorite(rahul, { organizationId: citycare.id }, daysAgo(117));
  addFavorite(rahul, { organizationId: sunrise.id }, daysAgo(110));
  for (const patient of otherPatients) {
    for (let i = 0; i < rng.int(0, 3); i++) {
      const created = daysAgo(rng.int(1, Math.max(2, patient.seed.createdDaysAgo - 1)));
      if (rng.chance(0.6)) addFavorite(patient, { doctorId: rng.pick(approvedDoctors).id }, created);
      else addFavorite(patient, { organizationId: rng.pick(approvedOrgs).id }, created);
    }
  }

  // ── Carts (a few patients mid-shopping) ──────────────────
  for (const patient of rng.sample(otherPatients, 3)) {
    const pharmacy = rng.pick(approvedPharmacies);
    const cartId = randomUUID();
    rows.carts.push({ id: cartId, patientId: patient.id, pharmacyId: pharmacy.id, updatedAt: minutesAgo(rng.int(30, 3000)) });
    for (const line of pickOtcLines(pharmacy, rng.int(1, 3))) {
      rows.cartItems.push({ id: randomUUID(), cartId, medicineId: medicineIds.get(line.medicineKey)!, quantity: line.quantity });
    }
  }

  // ── Platform settings & counters ─────────────────────────
  rows.settings.push(
    { key: 'marketplace.name', value: 'CareBridge', description: 'Marketplace display name' },
    { key: 'orders.platformFee', value: String(PLATFORM_FEE), description: 'Flat platform fee per medicine order (INR)' },
    { key: 'orders.defaultDeliveryFee', value: '30', description: 'Default delivery fee when a pharmacy has not configured one (INR)' },
    { key: 'appointments.cancellationWindowHours', value: '2', description: 'Patients can cancel up to this many hours before the appointment' },
    { key: 'support.email', value: 'support@carebridge.demo', description: 'Support contact shown to users' },
    { key: 'demo.disclaimer', value: 'This is a demonstration application. Healthcare information shown here is sample data and must not be used for medical decisions.', description: 'Demo disclaimer text' },
  );

  // Transaction references in chronological order.
  rows.payments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const payments: Prisma.PaymentCreateManyInput[] = rows.payments.map((payment, index) => ({
    ...payment,
    transactionRef: formatSequence('transaction', year, index + 1),
  }));

  rows.counters.push(
    { key: sequenceKey('appointment', year), value: rows.appointments.length },
    { key: sequenceKey('prescription', year), value: scenario === 'complete' ? GOLDEN_RX_SEQUENCE : GOLDEN_RX_SEQUENCE - 1 },
    { key: sequenceKey('order', year), value: scenario === 'complete' ? GOLDEN_ORDER_SEQUENCE : GOLDEN_ORDER_SEQUENCE - 1 },
    { key: sequenceKey('labBooking', year), value: rows.labBookings.length },
    { key: sequenceKey('transaction', year), value: payments.length },
    { key: 'PT', value: patients.length },
  );

  // ─────────────────────────────────────────────────────────
  // Write everything
  // ─────────────────────────────────────────────────────────
  await truncateAll(prisma);

  const insert = async <T>(label: string, data: T[], write: (batch: T[]) => Promise<unknown>) => {
    for (const batch of chunk(data, 500)) await write(batch);
    log(`  ${label.padEnd(26)} ${data.length}`);
  };

  await insert('roles', rows.roles, (d) => prisma.role.createMany({ data: d }));
  await insert('permissions', rows.permissions, (d) => prisma.permission.createMany({ data: d }));
  await insert('role_permissions', rows.rolePermissions, (d) => prisma.rolePermission.createMany({ data: d }));
  await insert('users', rows.users, (d) => prisma.user.createMany({ data: d }));
  await insert('user_roles', rows.userRoles, (d) => prisma.userRole.createMany({ data: d }));
  await insert('platform_employees', rows.employees, (d) => prisma.platformEmployee.createMany({ data: d }));
  await insert('specialties', rows.specialties, (d) => prisma.specialty.createMany({ data: d }));
  await insert('medicine_categories', rows.categories, (d) => prisma.medicineCategory.createMany({ data: d }));
  await insert('organizations', rows.organizations, (d) => prisma.organization.createMany({ data: d }));
  await insert('organization_staff', rows.orgStaff, (d) => prisma.organizationStaff.createMany({ data: d }));
  await insert('organization_services', rows.orgServices, (d) => prisma.organizationService.createMany({ data: d }));
  await insert('medicines', rows.medicines, (d) => prisma.medicine.createMany({ data: d }));
  await insert('pharmacy_inventory', rows.inventory, (d) => prisma.pharmacyInventory.createMany({ data: d }));
  await insert('lab_tests', rows.labTests, (d) => prisma.labTest.createMany({ data: d }));
  await insert('lab_package_items', rows.labPackageItems, (d) => prisma.labPackageItem.createMany({ data: d }));
  await insert('doctors', rows.doctors, (d) => prisma.doctor.createMany({ data: d }));
  await insert('doctor_specialties', rows.doctorSpecialties, (d) => prisma.doctorSpecialty.createMany({ data: d }));
  await insert('doctor_organizations', rows.doctorOrganizations, (d) => prisma.doctorOrganization.createMany({ data: d }));
  await insert('doctor_availability', rows.availability, (d) => prisma.doctorAvailability.createMany({ data: d }));
  await insert('doctor_blocked_dates', rows.blockedDates, (d) => prisma.doctorBlockedDate.createMany({ data: d }));
  await insert('patients', rows.patients, (d) => prisma.patient.createMany({ data: d }));
  await insert('addresses', rows.addresses, (d) => prisma.address.createMany({ data: d }));
  await insert('documents', rows.documents, (d) => prisma.document.createMany({ data: d }));
  await insert('appointments', rows.appointments, (d) => prisma.appointment.createMany({ data: d }));
  await insert('appointment_status_history', rows.appointmentHistory, (d) => prisma.appointmentStatusHistory.createMany({ data: d }));
  await insert('consultations', rows.consultations, (d) => prisma.consultation.createMany({ data: d }));
  await insert('prescriptions', rows.prescriptions.map((p) => p.row), (d) => prisma.prescription.createMany({ data: d }));
  await insert('prescription_items', rows.prescriptionItems, (d) => prisma.prescriptionItem.createMany({ data: d }));
  await insert('orders', rows.orders, (d) => prisma.order.createMany({ data: d }));
  await insert('order_items', rows.orderItems, (d) => prisma.orderItem.createMany({ data: d }));
  await insert('order_status_history', rows.orderHistory, (d) => prisma.orderStatusHistory.createMany({ data: d }));
  await insert('deliveries', rows.deliveries, (d) => prisma.delivery.createMany({ data: d }));
  await insert('delivery_status_history', rows.deliveryHistory, (d) => prisma.deliveryStatusHistory.createMany({ data: d }));
  await insert('lab_bookings', rows.labBookings, (d) => prisma.labBooking.createMany({ data: d }));
  await insert('lab_booking_items', rows.labBookingItems, (d) => prisma.labBookingItem.createMany({ data: d }));
  await insert('payments', payments, (d) => prisma.payment.createMany({ data: d }));
  await insert('reviews', rows.reviews, (d) => prisma.review.createMany({ data: d }));
  await insert('favorites', rows.favorites, (d) => prisma.favorite.createMany({ data: d }));
  await insert('carts', rows.carts, (d) => prisma.cart.createMany({ data: d }));
  await insert('cart_items', rows.cartItems, (d) => prisma.cartItem.createMany({ data: d }));
  await insert('notifications', rows.notifications, (d) => prisma.notification.createMany({ data: d }));
  await insert('activity_logs', rows.activityLogs, (d) => prisma.activityLog.createMany({ data: d }));
  await insert('platform_settings', rows.settings, (d) => prisma.platformSetting.createMany({ data: d }));
  await insert('sequence_counters', rows.counters, (d) => prisma.sequenceCounter.createMany({ data: d }));

  const summary: SeedSummary = {
    users: rows.users.length,
    patients: rows.patients.length,
    doctors: rows.doctors.length,
    organizations: rows.organizations.length,
    medicines: rows.medicines.length,
    appointments: rows.appointments.length,
    consultations: rows.consultations.length,
    prescriptions: rows.prescriptions.length,
    prescriptionItems: rows.prescriptionItems.length,
    orders: rows.orders.length,
    orderItems: rows.orderItems.length,
    payments: payments.length,
    deliveries: rows.deliveries.length,
    reviews: rows.reviews.length,
    notifications: rows.notifications.length,
    activityLogs: rows.activityLogs.length,
    labTests: rows.labTests.length,
    labBookings: rows.labBookings.length,
  };
  return summary;
}

/** Remove all application data (keeps the Prisma migrations table). */
export async function truncateAll(prisma: PrismaClient) {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'
  `;
  if (!tables.length) return;
  const list = tables.map((table) => `"${table.tablename.replace(/"/g, '""')}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

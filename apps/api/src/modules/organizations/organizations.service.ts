import type { Prisma } from '@prisma/client';
import type { DoctorSummary, OrganizationDetail, OrganizationSummary } from '@carebridge/shared';
import { prisma } from '../../config/prisma';
import { getNextAvailableSlots } from '../../services/availability.service';
import { notFound } from '../../utils/errors';
import { toSkipTake } from '../../utils/http';
import { istParts } from '../../utils/time';
import type { ListOrganizationsQuery } from './organizations.schemas';

const listed = { approvalStatus: 'APPROVED', isActive: true } satisfies Prisma.OrganizationWhereInput;

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

function openStatus(org: { is24Hours: boolean; opensAt: string | null; closesAt: string | null; openDays: number[] }, now: Date) {
  if (org.is24Hours) return { isOpenNow: true, hoursLabel: 'Open 24 hours' };
  if (!org.opensAt || !org.closesAt) return { isOpenNow: false, hoursLabel: 'Hours not available' };

  const { dayOfWeek, hours, minutes } = istParts(now);
  const nowMinutes = hours * 60 + minutes;
  const opensAtMinutes = toMinutes(org.opensAt);
  const closesAtMinutes = toMinutes(org.closesAt);
  const openToday = org.openDays.includes(dayOfWeek);
  const isOpenNow = openToday && nowMinutes >= opensAtMinutes && nowMinutes < closesAtMinutes;

  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  };
  const hoursLabel = isOpenNow ? `Open until ${formatTime(org.closesAt)}` : openToday && nowMinutes < opensAtMinutes ? `Opens at ${formatTime(org.opensAt)}` : 'Closed now';
  return { isOpenNow, hoursLabel };
}

const summarySelect = {
  id: true,
  slug: true,
  name: true,
  type: true,
  category: true,
  description: true,
  logoUrl: true,
  locality: true,
  city: true,
  distanceKm: true,
  avgRating: true,
  reviewCount: true,
  is24Hours: true,
  opensAt: true,
  closesAt: true,
  openDays: true,
  deliveryAvailable: true,
  pickupAvailable: true,
  acceptsPrescriptions: true,
  deliveryEtaMinMinutes: true,
  deliveryEtaMaxMinutes: true,
  _count: { select: { doctors: { where: { isActive: true, doctor: { approvalStatus: 'APPROVED', isActive: true } } } } },
  doctors: {
    where: { isActive: true, doctor: { approvalStatus: 'APPROVED', isActive: true } },
    include: { doctor: { include: { specialties: { where: { isPrimary: true }, include: { specialty: { select: { name: true } } } } } } },
    take: 50,
  },
} satisfies Prisma.OrganizationSelect;

type OrganizationRow = Prisma.OrganizationGetPayload<{ select: typeof summarySelect }>;

function toSummary(org: OrganizationRow, now: Date): OrganizationSummary {
  const specialties = [...new Set(org.doctors.flatMap((link) => link.doctor.specialties.map((s) => s.specialty.name)))];
  const { isOpenNow, hoursLabel } = openStatus(org, now);
  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    type: org.type,
    category: org.category,
    description: org.description,
    logoUrl: org.logoUrl,
    locality: org.locality,
    city: org.city,
    distanceKm: org.distanceKm ? Number(org.distanceKm) : null,
    avgRating: Number(org.avgRating),
    reviewCount: org.reviewCount,
    doctorCount: org._count.doctors,
    specialties,
    isOpenNow,
    hoursLabel,
    is24Hours: org.is24Hours,
    ...(org.type === 'PHARMACY'
      ? {
          deliveryAvailable: org.deliveryAvailable,
          pickupAvailable: org.pickupAvailable,
          acceptsPrescriptions: org.acceptsPrescriptions,
          deliveryEtaMinMinutes: org.deliveryEtaMinMinutes,
          deliveryEtaMaxMinutes: org.deliveryEtaMaxMinutes,
        }
      : {}),
  };
}

export async function listOrganizations(query: ListOrganizationsQuery, forceType?: 'PHARMACY') {
  const where: Prisma.OrganizationWhereInput = {
    ...listed,
    ...(forceType ? { type: forceType } : query.type?.length ? { type: { in: query.type } } : {}),
    ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { category: { contains: query.q, mode: 'insensitive' } }] } : {}),
    ...(query.locality ? { locality: { equals: query.locality, mode: 'insensitive' } } : {}),
    ...(query.specialty
      ? { doctors: { some: { isActive: true, doctor: { approvalStatus: 'APPROVED', specialties: { some: { specialty: { slug: query.specialty } } } } } } }
      : {}),
    ...(query.deliveryAvailable !== undefined ? { deliveryAvailable: query.deliveryAvailable } : {}),
    ...(query.acceptsPrescriptions !== undefined ? { acceptsPrescriptions: query.acceptsPrescriptions } : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.organization.findMany({ where, select: summarySelect, orderBy: [{ avgRating: 'desc' }, { name: 'asc' }], ...toSkipTake(query) }),
    prisma.organization.count({ where }),
  ]);

  const now = new Date();
  return { data: rows.map((org) => toSummary(org, now)), total };
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function getOrganizationDetail(idOrSlug: string, forceType?: 'PHARMACY'): Promise<OrganizationDetail> {
  const org = await prisma.organization.findFirst({
    where: { ...(isUuidLike(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug }), ...listed, ...(forceType ? { type: forceType } : {}) },
    select: {
      ...summarySelect,
      phone: true,
      email: true,
      addressLine1: true,
      addressLine2: true,
      state: true,
      postalCode: true,
      bedCount: true,
      emergencyAvailable: true,
      deliveryFee: true,
      freeDeliveryAbove: true,
      services: {
        where: { isActive: true },
        include: { specialty: { select: { name: true } } },
        orderBy: { name: 'asc' },
      },
      reviews: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { patient: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } } },
      },
    },
  });
  if (!org) throw notFound(forceType === 'PHARMACY' ? 'Pharmacy' : 'Organization');

  const doctorRows = await prisma.doctorOrganization.findMany({
    where: { organizationId: org.id, isActive: true, doctor: { approvalStatus: 'APPROVED', isActive: true } },
    include: {
      doctor: {
        include: {
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
          specialties: { include: { specialty: { select: { name: true } } }, orderBy: { isPrimary: 'desc' } },
        },
      },
    },
  });
  const nextSlots = await getNextAvailableSlots(doctorRows.map((row) => row.doctorId));

  const doctors: Array<DoctorSummary & { title: string | null }> = doctorRows.map((row) => ({
    id: row.doctor.id,
    slug: row.doctor.slug,
    name: `Dr. ${row.doctor.user.firstName} ${row.doctor.user.lastName}`,
    avatarUrl: row.doctor.user.avatarUrl,
    qualifications: row.doctor.qualifications,
    experienceYears: row.doctor.experienceYears,
    gender: row.doctor.gender,
    languages: row.doctor.languages,
    specialties: row.doctor.specialties.map((s) => s.specialty.name),
    primarySpecialty: row.doctor.specialties[0]?.specialty.name ?? 'General Physician',
    consultationFee: Number(row.consultationFee ?? row.doctor.consultationFee),
    consultationTypes: row.doctor.consultationTypes,
    avgRating: Number(row.doctor.avgRating),
    reviewCount: row.doctor.reviewCount,
    primaryOrganization: { id: org.id, name: org.name, type: org.type, locality: org.locality },
    nextAvailableSlot: nextSlots.get(row.doctorId) ?? null,
    title: row.title,
  }));

  const now = new Date();
  return {
    ...toSummary(org, now),
    phone: org.phone,
    email: org.email,
    addressLine1: org.addressLine1,
    addressLine2: org.addressLine2,
    state: org.state,
    postalCode: org.postalCode,
    bedCount: org.bedCount,
    emergencyAvailable: org.emergencyAvailable,
    deliveryFee: org.deliveryFee ? Number(org.deliveryFee) : null,
    freeDeliveryAbove: org.freeDeliveryAbove ? Number(org.freeDeliveryAbove) : null,
    services: org.services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price ? Number(service.price) : null,
      durationMinutes: service.durationMinutes,
      specialty: service.specialty?.name ?? null,
    })),
    doctors,
    reviews: org.reviews.map((review) => ({
      id: review.id,
      patientName: `${review.patient.user.firstName} ${review.patient.user.lastName.charAt(0)}.`,
      patientAvatarUrl: review.patient.user.avatarUrl,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    })),
  };
}

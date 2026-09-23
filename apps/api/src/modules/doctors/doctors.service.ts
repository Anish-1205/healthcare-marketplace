import type { Prisma } from '@prisma/client';
import type { DoctorDetail, DoctorSummary } from '@carebridge/shared';
import { prisma } from '../../config/prisma';
import { getNextAvailableSlot, getNextAvailableSlots, getSlotsForDate } from '../../services/availability.service';
import { notFound } from '../../utils/errors';
import { toSkipTake } from '../../utils/http';
import type { ListDoctorsQuery } from './doctors.schemas';

const listedDoctor = { approvalStatus: 'APPROVED', isActive: true, user: { status: 'ACTIVE' } } satisfies Prisma.DoctorWhereInput;

const summaryInclude = {
  user: { select: { firstName: true, lastName: true, avatarUrl: true } },
  specialties: { include: { specialty: { select: { name: true, slug: true } } }, orderBy: { isPrimary: 'desc' as const } },
  organizations: {
    where: { isActive: true },
    orderBy: { isPrimary: 'desc' as const },
    include: { organization: { select: { id: true, name: true, slug: true, type: true, locality: true } } },
  },
} satisfies Prisma.DoctorInclude;

type DoctorRow = Prisma.DoctorGetPayload<{ include: typeof summaryInclude }>;

function toSummary(doctor: DoctorRow, nextSlot: DoctorSummary['nextAvailableSlot']): DoctorSummary {
  const primaryLink = doctor.organizations[0];
  return {
    id: doctor.id,
    slug: doctor.slug,
    name: `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`,
    avatarUrl: doctor.user.avatarUrl,
    qualifications: doctor.qualifications,
    experienceYears: doctor.experienceYears,
    gender: doctor.gender,
    languages: doctor.languages,
    specialties: doctor.specialties.map((s) => s.specialty.name),
    primarySpecialty: doctor.specialties[0]?.specialty.name ?? 'General Physician',
    consultationFee: Number(primaryLink?.consultationFee ?? doctor.consultationFee),
    consultationTypes: doctor.consultationTypes,
    avgRating: Number(doctor.avgRating),
    reviewCount: doctor.reviewCount,
    primaryOrganization: primaryLink
      ? { id: primaryLink.organization.id, name: primaryLink.organization.name, type: primaryLink.organization.type, locality: primaryLink.organization.locality }
      : null,
    nextAvailableSlot: nextSlot,
  };
}

export async function listDoctors(query: ListDoctorsQuery) {
  const where: Prisma.DoctorWhereInput = {
    ...listedDoctor,
    ...(query.q ? { user: { ...listedDoctor.user, OR: [{ firstName: { contains: query.q, mode: 'insensitive' } }, { lastName: { contains: query.q, mode: 'insensitive' } }] } } : {}),
    ...(query.specialty ? { specialties: { some: { specialty: { slug: query.specialty } } } } : {}),
    ...(query.organizationId ? { organizations: { some: { organizationId: query.organizationId, isActive: true } } } : {}),
    ...(query.type?.length ? { consultationTypes: { hasSome: query.type } } : {}),
    ...(query.feeMax !== undefined ? { consultationFee: { lte: query.feeMax } } : {}),
    ...(query.minRating !== undefined ? { avgRating: { gte: query.minRating } } : {}),
    ...(query.language ? { languages: { has: query.language } } : {}),
    ...(query.locality ? { organizations: { some: { isActive: true, organization: { locality: { equals: query.locality, mode: 'insensitive' } } } } } : {}),
  };

  const orderBy: Prisma.DoctorOrderByWithRelationInput =
    query.sort.field === 'rating'
      ? { avgRating: query.sort.direction }
      : query.sort.field === 'fee'
        ? { consultationFee: query.sort.direction }
        : query.sort.field === 'experience'
          ? { experienceYears: query.sort.direction }
          : { user: { firstName: query.sort.direction } };

  const [rows, total] = await prisma.$transaction([
    prisma.doctor.findMany({ where, include: summaryInclude, orderBy, ...toSkipTake(query) }),
    prisma.doctor.count({ where }),
  ]);

  const slots = await getNextAvailableSlots(rows.map((doctor) => doctor.id));
  const data = rows.map((doctor) => toSummary(doctor, slots.get(doctor.id) ?? null));
  return { data, total };
}

async function findDoctorRow(idOrSlug: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  return prisma.doctor.findFirst({
    where: { ...(isUuid ? { id: idOrSlug } : { slug: idOrSlug }), ...listedDoctor },
    include: {
      ...summaryInclude,
      availability: { where: { isActive: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
      reviews: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { patient: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } } },
      },
    },
  });
}

export async function getDoctorDetail(idOrSlug: string): Promise<DoctorDetail> {
  const doctor = await findDoctorRow(idOrSlug);
  if (!doctor) throw notFound('Doctor');

  const nextAvailableSlot = await getNextAvailableSlot(doctor.id);
  const orgNames = new Map(doctor.organizations.map((link) => [link.organizationId, link.organization.name]));

  return {
    ...toSummary(doctor, nextAvailableSlot),
    bio: doctor.bio,
    registrationNumber: doctor.registrationNumber,
    slotDurationMinutes: doctor.slotDurationMinutes,
    organizations: doctor.organizations.map((link) => ({
      organizationId: link.organization.id,
      organizationName: link.organization.name,
      organizationType: link.organization.type,
      organizationSlug: link.organization.slug,
      locality: link.organization.locality,
      title: link.title,
      isPrimary: link.isPrimary,
      consultationFee: Number(link.consultationFee ?? doctor.consultationFee),
    })),
    availability: doctor.availability.map((window) => ({
      dayOfWeek: window.dayOfWeek,
      startTime: window.startTime,
      endTime: window.endTime,
      organizationId: window.organizationId,
      organizationName: window.organizationId ? (orgNames.get(window.organizationId) ?? 'Clinic') : 'Online consultation',
      consultationTypes: window.consultationTypes,
    })),
    reviews: doctor.reviews.map((review) => ({
      id: review.id,
      patientName: `${review.patient.user.firstName} ${review.patient.user.lastName.charAt(0)}.`,
      patientAvatarUrl: review.patient.user.avatarUrl,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    })),
  };
}

export async function getDoctorSlots(idOrSlug: string, date: Date) {
  const doctor = await prisma.doctor.findFirst({ where: { ...(isUuidLike(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug }), ...listedDoctor }, select: { id: true } });
  if (!doctor) throw notFound('Doctor');
  return getSlotsForDate(doctor.id, date);
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

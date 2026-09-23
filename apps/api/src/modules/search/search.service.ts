import type { Prisma } from '@prisma/client';
import type { SearchResponse, SearchResult } from '@carebridge/shared';
import { prisma } from '../../config/prisma';

const PER_GROUP = 5;
const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const });

/** Split "Dr. Maya Rao" into ["maya", "rao"]; honorifics are ignored. */
function nameTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s.,]+/)
    .filter((token) => token && token !== 'dr');
}

const listedOrganization = { approvalStatus: 'APPROVED', isActive: true } satisfies Prisma.OrganizationWhereInput;

async function searchDoctors(query: string): Promise<SearchResult[]> {
  const tokens = nameTokens(query);
  const doctors = await prisma.doctor.findMany({
    where: {
      approvalStatus: 'APPROVED',
      isActive: true,
      user: { status: 'ACTIVE' },
      OR: [
        ...(tokens.length
          ? [{ AND: tokens.map((token) => ({ OR: [{ user: { firstName: contains(token) } }, { user: { lastName: contains(token) } }] })) }]
          : []),
        { specialties: { some: { specialty: { name: contains(query) } } } },
      ],
    },
    orderBy: [{ avgRating: 'desc' }, { experienceYears: 'desc' }],
    take: PER_GROUP,
    select: {
      id: true,
      qualifications: true,
      avgRating: true,
      user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      specialties: { where: { isPrimary: true }, select: { specialty: { select: { name: true } } } },
      organizations: { where: { isActive: true, isPrimary: true }, select: { organization: { select: { name: true } } } },
    },
  });

  return doctors.map((doctor) => {
    const specialty = doctor.specialties[0]?.specialty.name ?? 'Doctor';
    const place = doctor.organizations[0]?.organization.name ?? 'Online consultations';
    return {
      id: doctor.id,
      type: 'doctor',
      title: `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`,
      subtitle: `${specialty} · ${place}`,
      href: `/doctors/${doctor.id}`,
      imageUrl: doctor.user.avatarUrl,
      badge: Number(doctor.avgRating) > 0 ? `${Number(doctor.avgRating).toFixed(1)}★` : undefined,
    };
  });
}

async function searchSpecialties(query: string): Promise<SearchResult[]> {
  const specialties = await prisma.specialty.findMany({
    where: { OR: [{ name: contains(query) }, { description: contains(query) }] },
    orderBy: { sortOrder: 'asc' },
    take: PER_GROUP,
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { doctors: { where: { doctor: { approvalStatus: 'APPROVED', isActive: true } } } } },
    },
  });
  return specialties.map((specialty) => ({
    id: specialty.id,
    type: 'specialty',
    title: specialty.name,
    subtitle: `${specialty._count.doctors} doctor${specialty._count.doctors === 1 ? '' : 's'} available`,
    href: `/doctors?specialty=${specialty.slug}`,
    imageUrl: null,
  }));
}

async function searchMedicines(query: string): Promise<SearchResult[]> {
  const medicines = await prisma.medicine.findMany({
    where: {
      isActive: true,
      OR: [{ name: contains(query) }, { genericName: contains(query) }, { brand: contains(query) }],
    },
    orderBy: { name: 'asc' },
    take: PER_GROUP,
    select: { id: true, name: true, manufacturer: true, packSize: true, imageUrl: true, requiresPrescription: true },
  });
  return medicines.map((medicine) => ({
    id: medicine.id,
    type: 'medicine',
    title: medicine.name,
    subtitle: `${medicine.manufacturer} · ${medicine.packSize}`,
    href: `/medicines/${medicine.id}`,
    imageUrl: medicine.imageUrl,
    badge: medicine.requiresPrescription ? 'Rx' : undefined,
  }));
}

async function searchOrganizations(query: string, type: 'CLINIC' | 'HOSPITAL' | 'PHARMACY'): Promise<SearchResult[]> {
  const organizations = await prisma.organization.findMany({
    where: { ...listedOrganization, type, OR: [{ name: contains(query) }, { locality: contains(query) }, { category: contains(query) }] },
    orderBy: [{ avgRating: 'desc' }, { name: 'asc' }],
    take: PER_GROUP,
    select: { id: true, name: true, category: true, locality: true, logoUrl: true, avgRating: true },
  });
  return organizations.map((organization) => ({
    id: organization.id,
    type: type === 'PHARMACY' ? 'pharmacy' : type === 'HOSPITAL' ? 'hospital' : 'clinic',
    title: organization.name,
    subtitle: [organization.category, organization.locality].filter(Boolean).join(' · '),
    href: type === 'PHARMACY' ? `/pharmacies/${organization.id}` : `/organizations/${organization.id}`,
    imageUrl: organization.logoUrl,
    badge: Number(organization.avgRating) > 0 ? `${Number(organization.avgRating).toFixed(1)}★` : undefined,
  }));
}

/** Universal header search. Only approved, active providers are returned. */
export async function search(query: string): Promise<SearchResponse> {
  const [doctors, specialties, medicines, clinics, hospitals, pharmacies] = await Promise.all([
    searchDoctors(query),
    searchSpecialties(query),
    searchMedicines(query),
    searchOrganizations(query, 'CLINIC'),
    searchOrganizations(query, 'HOSPITAL'),
    searchOrganizations(query, 'PHARMACY'),
  ]);
  const groups = { doctors, specialties, medicines, clinics, hospitals, pharmacies };
  return { query, total: Object.values(groups).reduce((sum, group) => sum + group.length, 0), groups };
}

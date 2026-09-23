import { prisma } from '../../config/prisma';
import type { AuthContext } from '../../types/auth';
import { notFound } from '../../utils/errors';
import type { Target } from '../reviews/reviews.schemas';
import { patientId, validateTarget } from '../reviews/reviews.service';

export async function listFavorites(auth: AuthContext) {
  const rows = await prisma.favorite.findMany({ where: { patientId: patientId(auth) }, orderBy: { createdAt: 'desc' }, include: { doctor: { select: { id: true, slug: true, user: { select: { firstName: true, lastName: true } } } }, organization: { select: { id: true, slug: true, name: true, type: true } } } });
  return rows.map((row) => ({ id: row.id, targetId: row.doctorId ?? row.organizationId!, targetType: row.doctor ? 'DOCTOR' : row.organization!.type, name: row.doctor ? `Dr. ${row.doctor.user.firstName} ${row.doctor.user.lastName}` : row.organization!.name, href: row.doctor ? `/doctors/${row.doctor.slug}` : `/${row.organization!.type === 'PHARMACY' ? 'pharmacies' : 'organizations'}/${row.organization!.slug}` }));
}
export async function addFavorite(auth: AuthContext, target: Target) {
  const id = patientId(auth);
  await validateTarget(target);
  return target.targetType === 'DOCTOR'
    ? prisma.favorite.upsert({ where: { patientId_doctorId: { patientId: id, doctorId: target.targetId } }, create: { patientId: id, doctorId: target.targetId }, update: {} })
    : prisma.favorite.upsert({ where: { patientId_organizationId: { patientId: id, organizationId: target.targetId } }, create: { patientId: id, organizationId: target.targetId }, update: {} });
}
export async function removeFavorite(auth: AuthContext, id: string) {
  const result = await prisma.favorite.deleteMany({ where: { id, patientId: patientId(auth) } });
  if (!result.count) throw notFound('Favorite');
  return { id, removed: true };
}

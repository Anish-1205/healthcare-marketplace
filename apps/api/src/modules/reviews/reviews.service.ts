import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type { AuthContext } from '../../types/auth';
import { conflict, forbidden, notFound } from '../../utils/errors';
import type { Target } from './reviews.schemas';

export function patientId(auth: AuthContext) {
  if (!auth.roles.includes('PATIENT') || !auth.patientId) throw forbidden('A patient account is required.');
  return auth.patientId;
}
export function targetWhere(target: Target) {
  return target.targetType === 'DOCTOR' ? { doctorId: target.targetId } : { organizationId: target.targetId };
}
export async function validateTarget(target: Target, db: Prisma.TransactionClient = prisma) {
  const row = target.targetType === 'DOCTOR'
    ? await db.doctor.findFirst({ where: { id: target.targetId, isActive: true, approvalStatus: 'APPROVED' } })
    : await db.organization.findFirst({ where: { id: target.targetId, isActive: true, approvalStatus: 'APPROVED', ...(target.targetType === 'ORGANIZATION' ? {} : { type: target.targetType }) } });
  if (!row) throw notFound('Provider');
  return row;
}
async function usage(id: string, target: Target, db: Prisma.TransactionClient) {
  const provider = await validateTarget(target, db);
  if ('type' in provider && provider.type === 'PHARMACY') {
    const order = await db.order.findFirst({ where: { patientId: id, pharmacyId: provider.id, status: 'DELIVERED' }, orderBy: { createdAt: 'desc' } });
    return order ? { orderId: order.id } : null;
  }
  const appointment = await db.appointment.findFirst({ where: { patientId: id, ...targetWhere(target), status: 'COMPLETED' }, orderBy: { createdAt: 'desc' } });
  return appointment ? { appointmentId: appointment.id } : null;
}
export async function eligibility(auth: AuthContext, target: Target) {
  const id = patientId(auth);
  const [used, review] = await Promise.all([
    usage(id, target, prisma),
    prisma.review.findFirst({ where: { patientId: id, ...targetWhere(target) }, orderBy: { createdAt: 'desc' } }),
  ]);
  return { eligible: Boolean(used) && !review, review };
}
export async function createReview(auth: AuthContext, input: Target & { rating: number; text: string }) {
  const id = patientId(auth);
  return prisma.$transaction(async (tx) => {
    // Lock the patient so simultaneous submissions cannot bypass the duplicate check.
    await tx.$queryRaw`SELECT id FROM patients WHERE id = ${id}::uuid FOR UPDATE`;
    const used = await usage(id, input, tx);
    if (!used) throw forbidden('Complete an appointment or receive an order from this provider before reviewing.', 'REVIEW_INELIGIBLE');
    if (await tx.review.findFirst({ where: { patientId: id, ...targetWhere(input) } })) throw conflict('REVIEW_EXISTS', 'You have already reviewed this provider.');
    return tx.review.create({ data: { patientId: id, ...targetWhere(input), ...used, rating: input.rating, comment: input.text, status: 'PENDING' } });
  });
}
export async function listReviews(target: Target | undefined, mine: string | undefined) {
  return prisma.review.findMany({
    where: { ...(target ? targetWhere(target) : {}), ...(mine ? { patientId: mine } : { status: 'APPROVED' }) },
    select: { id: true, doctorId: true, organizationId: true, rating: true, comment: true, status: true, createdAt: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
}

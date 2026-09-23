import { Prisma } from '@prisma/client';
import type { HealthDocument, HealthRecordsOverview, LabBookingSummary, LabTestSummary } from '@carebridge/shared';
import { LAB_TIME_SLOTS } from '@carebridge/shared';
import { prisma } from '../../config/prisma';
import type { AuthContext } from '../../types/auth';
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors';
import { nextNumber } from '../../utils/sequence';
import { toSkipTake } from '../../utils/http';
import { createMockDocument } from '../../services/document.service';
import { ACTIVITY, logActivity } from '../../services/activity-log.service';
import { notify } from '../../services/notification.service';
import type { CreateLabBookingInput, ListHealthDocumentsInput, ListLabBookingsInput, ListLabTestsInput, UploadHealthDocumentInput } from './labs.schemas';

const testSelect = {
  id: true, code: true, name: true, slug: true, category: true, description: true, isPackage: true,
  parametersCount: true, sampleType: true, fastingRequired: true, turnaroundHours: true, mrp: true,
  price: true, homeCollectionAvailable: true, isPopular: true,
} satisfies Prisma.LabTestSelect;

type TestRow = Prisma.LabTestGetPayload<{ select: typeof testSelect }>;
const mapTest = (row: TestRow): LabTestSummary => ({ ...row, mrp: Number(row.mrp), price: Number(row.price) });
const patientId = (auth: AuthContext) => {
  if (!auth.patientId) throw forbidden('A patient profile is required.');
  return auth.patientId;
};
const personName = (user: { firstName: string; lastName: string }) => `${user.firstName} ${user.lastName}`;
const dateOnly = (value: Date) => value.toISOString().slice(0, 10);
const todayInIndia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

export async function listLabTests(query: ListLabTestsInput) {
  const where: Prisma.LabTestWhereInput = {
    isActive: true,
    ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { code: { contains: query.q, mode: 'insensitive' } }, { category: { contains: query.q, mode: 'insensitive' } }] } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.package !== undefined ? { isPackage: query.package } : {}),
    ...(query.popular !== undefined ? { isPopular: query.popular } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.labTest.findMany({ where, select: testSelect, orderBy: [{ isPopular: 'desc' }, { isPackage: 'desc' }, { name: 'asc' }], ...toSkipTake(query) }),
    prisma.labTest.count({ where }),
  ]);
  return { data: rows.map(mapTest), total };
}

export async function labCategories() {
  const rows = await prisma.labTest.findMany({ where: { isActive: true }, distinct: ['category'], select: { category: true }, orderBy: { category: 'asc' } });
  return rows.map((row) => row.category);
}

export async function getLabTest(idOrSlug: string) {
  const row = await prisma.labTest.findFirst({
    where: { isActive: true, OR: [{ id: idOrSlug.match(/^[0-9a-f-]{36}$/i) ? idOrSlug : undefined }, { slug: idOrSlug }] },
    select: { ...testSelect, packageItems: { include: { test: { select: testSelect } }, orderBy: { test: { name: 'asc' } } } },
  });
  if (!row) throw notFound('Lab test');
  const { packageItems, ...test } = row;
  return { ...mapTest(test), includedTests: packageItems.map((item) => mapTest(item.test)) };
}

const bookingInclude = {
  items: { include: { labTest: { select: { id: true, name: true, slug: true, sampleType: true, fastingRequired: true } } }, orderBy: { id: 'asc' as const } },
  address: true,
  payments: { orderBy: { createdAt: 'desc' as const }, take: 1 },
  reportDocument: true,
} satisfies Prisma.LabBookingInclude;
type BookingRow = Prisma.LabBookingGetPayload<{ include: typeof bookingInclude }>;

const documentDto = (row: Prisma.DocumentGetPayload<object>): HealthDocument => ({
  id: row.id, type: row.type as HealthDocument['type'], title: row.title, fileName: row.fileName,
  mimeType: row.mimeType, sizeBytes: row.sizeBytes, storageUrl: row.storageUrl, notes: row.notes,
  recordDate: row.recordDate ? dateOnly(row.recordDate) : null, createdAt: row.createdAt.toISOString(),
  source: row.type === 'LAB_REPORT' ? 'LAB_REPORT' : 'UPLOAD',
});

const bookingDto = (row: BookingRow): LabBookingSummary => ({
  id: row.id, bookingNumber: row.bookingNumber, collectionType: row.collectionType,
  scheduledDate: dateOnly(row.scheduledDate), timeSlot: row.timeSlot, status: row.status,
  totalAmount: Number(row.totalAmount), notes: row.notes, createdAt: row.createdAt.toISOString(),
  tests: row.items.map((item) => ({ ...item.labTest, price: Number(item.price) })),
  address: row.address ? { id: row.address.id, label: row.address.label, recipient: row.address.recipient, phone: row.address.phone, line1: row.address.line1, locality: row.address.locality, city: row.address.city, postalCode: row.address.postalCode } : null,
  payment: row.payments[0] ? { id: row.payments[0].id, transactionRef: row.payments[0].transactionRef, method: row.payments[0].method, status: row.payments[0].status, amount: Number(row.payments[0].amount) } : null,
  report: row.reportDocument ? documentDto(row.reportDocument) : null,
  canCancel: row.status === 'BOOKED' && dateOnly(row.scheduledDate) >= todayInIndia(),
});

export async function bookingContext(auth: AuthContext) {
  patientId(auth);
  const addresses = await prisma.address.findMany({ where: { userId: auth.userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  return { addresses, timeSlots: [...LAB_TIME_SLOTS] };
}

export async function createLabBooking(auth: AuthContext, input: CreateLabBookingInput) {
  const ownPatientId = patientId(auth);
  const today = todayInIndia();
  const latest = new Date(`${today}T00:00:00.000Z`); latest.setUTCDate(latest.getUTCDate() + 30);
  if (input.scheduledDate < today || input.scheduledDate > dateOnly(latest)) throw badRequest('INVALID_COLLECTION_DATE', 'Choose a collection date within the next 30 days.');

  const id = await prisma.$transaction(async (tx) => {
    const tests = await tx.labTest.findMany({ where: { id: { in: input.testIds }, isActive: true }, select: { ...testSelect } });
    if (tests.length !== input.testIds.length) throw badRequest('INVALID_LAB_TEST', 'One or more selected lab tests are unavailable.');
    if (input.collectionType === 'HOME_COLLECTION' && tests.some((test) => !test.homeCollectionAvailable)) throw badRequest('HOME_COLLECTION_UNAVAILABLE', 'One or more selected tests require a lab visit.');
    if (input.addressId) {
      const address = await tx.address.findFirst({ where: { id: input.addressId, userId: auth.userId } });
      if (!address) throw notFound('Address');
    }
    const createdAddress = input.collectionType === 'HOME_COLLECTION' && !input.addressId && input.address
      ? await tx.address.create({ data: { ...input.address, userId: auth.userId, isDefault: false } })
      : null;
    const total = tests.reduce((sum, test) => sum + Number(test.price), 0);
    const row = await tx.labBooking.create({
      data: {
        bookingNumber: await nextNumber(tx, 'labBooking'), patientId: ownPatientId,
        addressId: input.collectionType === 'HOME_COLLECTION' ? (input.addressId ?? createdAddress?.id) : null,
        collectionType: input.collectionType, scheduledDate: new Date(`${input.scheduledDate}T00:00:00.000Z`),
        timeSlot: input.timeSlot, totalAmount: total, notes: input.notes,
        items: { create: tests.map((test) => ({ labTestId: test.id, price: test.price })) },
      },
    });
    await tx.payment.create({ data: { transactionRef: await nextNumber(tx, 'transaction'), patientId: ownPatientId, purpose: 'LAB_BOOKING', labBookingId: row.id, amount: total, method: input.paymentMethod, methodDetail: input.paymentMethod === 'UPI' ? 'patient@okdemo' : 'VISA •••• 4242', status: 'PAID', paidAt: new Date() } });
    await notify({ userId: auth.userId, type: 'LAB_BOOKING_CONFIRMED', title: 'Lab test booked', message: `${tests[0].name}${tests.length > 1 ? ` and ${tests.length - 1} more` : ''} scheduled for ${input.scheduledDate}.`, link: `/lab-bookings/${row.id}`, entityType: 'LabBooking', entityId: row.id }, tx);
    await logActivity({ action: ACTIVITY.LAB_BOOKING_CREATED, entityType: 'LabBooking', entityId: row.id, actorUserId: auth.userId, description: `Booked ${tests.map((test) => test.name).join(', ')}`, metadata: { collectionType: input.collectionType, scheduledDate: input.scheduledDate } }, tx);
    return row.id;
  });
  return getLabBooking(auth, id);
}

export async function listLabBookings(auth: AuthContext, query: ListLabBookingsInput) {
  const ownPatientId = patientId(auth);
  const where = { patientId: ownPatientId, ...(query.status ? { status: query.status } : {}) };
  const [rows, total] = await prisma.$transaction([
    prisma.labBooking.findMany({ where, include: bookingInclude, orderBy: [{ scheduledDate: 'desc' }, { createdAt: 'desc' }], ...toSkipTake(query) }),
    prisma.labBooking.count({ where }),
  ]);
  return { data: rows.map(bookingDto), total };
}

export async function getLabBooking(auth: AuthContext, id: string) {
  const row = await prisma.labBooking.findFirst({ where: { id, patientId: patientId(auth) }, include: bookingInclude });
  if (!row) throw notFound('Lab booking');
  return bookingDto(row);
}

export async function cancelLabBooking(auth: AuthContext, id: string) {
  const ownPatientId = patientId(auth);
  await prisma.$transaction(async (tx) => {
    const row = await tx.labBooking.findFirst({ where: { id, patientId: ownPatientId }, include: { payments: true } });
    if (!row) throw notFound('Lab booking');
    if (row.status !== 'BOOKED') throw conflict('LAB_BOOKING_NOT_CANCELLABLE', 'Only booked collections can be cancelled.');
    await tx.labBooking.update({ where: { id }, data: { status: 'CANCELLED' } });
    await tx.payment.updateMany({ where: { labBookingId: id, status: 'PAID' }, data: { status: 'REFUNDED', refundedAt: new Date() } });
    await logActivity({ action: ACTIVITY.LAB_BOOKING_CANCELLED, entityType: 'LabBooking', entityId: id, actorUserId: auth.userId, description: `Cancelled lab booking ${row.bookingNumber}` }, tx);
  });
  return getLabBooking(auth, id);
}

export async function healthOverview(auth: AuthContext): Promise<HealthRecordsOverview> {
  const ownPatientId = patientId(auth);
  const [documents, prescriptions, consultations, appointments] = await Promise.all([
    prisma.document.findMany({ where: { patientId: ownPatientId }, orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }] }),
    prisma.prescription.findMany({ where: { patientId: ownPatientId, status: 'ISSUED' }, include: { doctor: { include: { user: true } }, _count: { select: { items: true } } }, orderBy: { issuedAt: 'desc' } }),
    prisma.consultation.findMany({ where: { patientId: ownPatientId }, include: { doctor: { include: { user: true } } }, orderBy: { startedAt: 'desc' } }),
    prisma.appointment.findMany({ where: { patientId: ownPatientId }, include: { doctor: { include: { user: true } }, organization: { select: { name: true } } }, orderBy: { scheduledStart: 'desc' } }),
  ]);
  const docs = documents.map(documentDto);
  return {
    counts: { prescriptions: prescriptions.length, consultations: consultations.length, documents: docs.length, labReports: docs.filter((doc) => doc.type === 'LAB_REPORT').length, appointments: appointments.length },
    documents: docs,
    prescriptions: prescriptions.map((row) => ({ id: row.id, prescriptionNumber: row.prescriptionNumber, diagnosis: row.diagnosis, issuedAt: row.issuedAt?.toISOString() ?? null, doctorName: `Dr. ${personName(row.doctor.user)}`, itemCount: row._count.items })),
    consultations: consultations.map((row) => ({ id: row.id, diagnosis: row.diagnosis, notes: row.notes, doctorName: `Dr. ${personName(row.doctor.user)}`, startedAt: row.startedAt.toISOString(), completedAt: row.completedAt?.toISOString() ?? null })),
    appointments: appointments.map((row) => ({ id: row.id, appointmentNumber: row.appointmentNumber, status: row.status, consultationType: row.consultationType, doctorName: `Dr. ${personName(row.doctor.user)}`, organizationName: row.organization?.name ?? null, scheduledStart: row.scheduledStart.toISOString() })),
  };
}

export async function listHealthDocuments(auth: AuthContext, query: ListHealthDocumentsInput) {
  const ownPatientId = patientId(auth);
  const where = { patientId: ownPatientId, ...(query.type ? { type: query.type } : {}) };
  const [rows, total] = await prisma.$transaction([
    prisma.document.findMany({ where, orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }], ...toSkipTake(query) }),
    prisma.document.count({ where }),
  ]);
  return { data: rows.map(documentDto), total };
}

export async function uploadHealthDocument(auth: AuthContext, input: UploadHealthDocumentInput) {
  const ownPatientId = patientId(auth);
  const row = await createMockDocument({ ...input, type: input.type, uploadedById: auth.userId, patientId: ownPatientId, recordDate: input.recordDate ? new Date(`${input.recordDate}T00:00:00.000Z`) : undefined });
  await logActivity({ action: ACTIVITY.HEALTH_DOCUMENT_UPLOADED, entityType: 'Document', entityId: row.id, actorUserId: auth.userId, description: `Uploaded health record ${row.title}` });
  return documentDto(row);
}

export async function deleteHealthDocument(auth: AuthContext, id: string) {
  patientId(auth);
  const row = await prisma.document.findFirst({ where: { id, patientId: auth.patientId!, uploadedById: auth.userId }, include: { labBookings: { select: { id: true }, take: 1 }, orders: { select: { id: true }, take: 1 } } });
  if (!row) throw notFound('Document');
  if (row.type === 'LAB_REPORT' || row.labBookings.length || row.orders.length) throw conflict('DOCUMENT_LINKED', 'Linked reports and order documents cannot be deleted.');
  await prisma.$transaction(async (tx) => {
    await tx.document.delete({ where: { id } });
    await logActivity({ action: ACTIVITY.HEALTH_DOCUMENT_DELETED, entityType: 'Document', entityId: id, actorUserId: auth.userId, description: `Deleted health record ${row.title}` }, tx);
  });
  return { deleted: true };
}

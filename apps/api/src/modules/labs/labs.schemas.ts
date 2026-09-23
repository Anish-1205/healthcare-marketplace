import { z } from 'zod';
import { DOCUMENT_MIME_TYPES, LAB_BOOKING_STATUSES, LAB_TIME_SLOTS } from '@carebridge/shared';
import { paginationQuery } from '../../utils/http';
import { mockDocumentSchema } from '../../services/document.service';

export const listLabTestsSchema = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  package: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  popular: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
});

export const labTestParamSchema = z.object({ id: z.string().trim().min(1).max(100) });

export const createLabBookingSchema = z.object({
  testIds: z.array(z.uuid()).min(1).max(10).refine((ids) => new Set(ids).size === ids.length, 'Choose each test once.'),
  collectionType: z.enum(['HOME_COLLECTION', 'LAB_VISIT']),
  scheduledDate: z.iso.date(),
  timeSlot: z.enum(LAB_TIME_SLOTS),
  addressId: z.uuid().optional(),
  address: z.object({
    label: z.string().trim().min(1).max(50), recipient: z.string().trim().min(1).max(100),
    phone: z.string().trim().min(7).max(30), line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).optional(), locality: z.string().trim().min(1).max(100),
    city: z.string().trim().min(1).max(100), state: z.string().trim().min(1).max(100),
    postalCode: z.string().regex(/^\d{6}$/, 'Enter a 6-digit postal code.'),
  }).optional(),
  paymentMethod: z.enum(['UPI', 'CARD']),
  notes: z.string().trim().max(500).optional(),
}).refine((input) => input.collectionType !== 'HOME_COLLECTION' || input.addressId || input.address, { path: ['addressId'], message: 'Choose or enter a home collection address.' });

export const listLabBookingsSchema = paginationQuery.extend({ status: z.enum(LAB_BOOKING_STATUSES).optional() });

const patientDocumentTypes = ['PRESCRIPTION', 'MEDICAL_REPORT', 'DISCHARGE_SUMMARY', 'INSURANCE', 'OTHER'] as const;
export const uploadHealthDocumentSchema = mockDocumentSchema.extend({
  type: z.enum(patientDocumentTypes),
  mimeType: z.enum(DOCUMENT_MIME_TYPES),
  recordDate: z.iso.date().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const listHealthDocumentsSchema = paginationQuery.extend({
  type: z.enum([...patientDocumentTypes, 'LAB_REPORT']).optional(),
});

export type ListLabTestsInput = z.infer<typeof listLabTestsSchema>;
export type CreateLabBookingInput = z.infer<typeof createLabBookingSchema>;
export type ListLabBookingsInput = z.infer<typeof listLabBookingsSchema>;
export type UploadHealthDocumentInput = z.infer<typeof uploadHealthDocumentSchema>;
export type ListHealthDocumentsInput = z.infer<typeof listHealthDocumentsSchema>;

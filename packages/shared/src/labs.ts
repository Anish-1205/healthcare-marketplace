import type { AppointmentStatus, ConsultationType, LabBookingStatus, PaymentMethod, PaymentStatus } from './statuses';
import type { DocumentMimeType } from './api';

export type LabCollectionType = 'HOME_COLLECTION' | 'LAB_VISIT';
export type PatientDocumentType = 'PRESCRIPTION' | 'LAB_REPORT' | 'MEDICAL_REPORT' | 'DISCHARGE_SUMMARY' | 'INSURANCE' | 'OTHER';
export const LAB_TIME_SLOTS = ['07:00 - 08:00', '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '16:00 - 17:00', '17:00 - 18:00'] as const;

export interface LabTestSummary {
  id: string; code: string; name: string; slug: string; category: string; description: string | null;
  isPackage: boolean; parametersCount: number; sampleType: string; fastingRequired: boolean;
  turnaroundHours: number; mrp: number; price: number; homeCollectionAvailable: boolean; isPopular: boolean;
}

export interface LabTestDetail extends LabTestSummary { includedTests: LabTestSummary[]; }

export interface LabBookingSummary {
  id: string; bookingNumber: string; collectionType: LabCollectionType; scheduledDate: string; timeSlot: string;
  status: LabBookingStatus; totalAmount: number; notes: string | null; createdAt: string;
  tests: Array<{ id: string; name: string; slug: string; price: number; sampleType: string; fastingRequired: boolean }>;
  address: { id: string; label: string; recipient: string; phone: string; line1: string; locality: string; city: string; postalCode: string } | null;
  payment: { id: string; transactionRef: string; method: PaymentMethod; status: PaymentStatus; amount: number } | null;
  report: HealthDocument | null; canCancel: boolean;
}

export interface LabBookingContext {
  addresses: Array<{ id: string; label: string; recipient: string; phone: string; line1: string; line2: string | null; locality: string; city: string; postalCode: string; isDefault: boolean }>;
  timeSlots: string[];
}

export interface CreateLabBookingPayload {
  testIds: string[]; collectionType: LabCollectionType; scheduledDate: string; timeSlot: string;
  addressId?: string;
  address?: { label: string; recipient: string; phone: string; line1: string; line2?: string; locality: string; city: string; state: string; postalCode: string };
  paymentMethod: Extract<PaymentMethod, 'UPI' | 'CARD'>; notes?: string;
}

export interface HealthDocument {
  id: string; type: PatientDocumentType; title: string; fileName: string; mimeType: string; sizeBytes: number;
  storageUrl: string; notes: string | null; recordDate: string | null; createdAt: string; source: 'UPLOAD' | 'LAB_REPORT';
}

export interface UploadHealthDocumentPayload {
  type: Exclude<PatientDocumentType, 'LAB_REPORT'>; title?: string; fileName: string; mimeType: DocumentMimeType;
  sizeBytes: number; recordDate?: string; notes?: string;
}

export interface HealthRecordsOverview {
  counts: { prescriptions: number; consultations: number; documents: number; labReports: number; appointments: number };
  documents: HealthDocument[];
  prescriptions: Array<{ id: string; prescriptionNumber: string; diagnosis: string | null; issuedAt: string | null; doctorName: string; itemCount: number }>;
  consultations: Array<{ id: string; diagnosis: string | null; notes: string | null; doctorName: string; startedAt: string; completedAt: string | null }>;
  appointments: Array<{ id: string; appointmentNumber: string; status: AppointmentStatus; consultationType: ConsultationType; doctorName: string; organizationName: string | null; scheduledStart: string }>;
}

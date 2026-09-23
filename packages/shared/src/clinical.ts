import type { ConsultationType, PrescriptionStatus } from './statuses';
import type { Gender } from './catalog';

/**
 * Consultations and prescriptions.
 *
 * All clinical text — complaints, observations, diagnosis, notes, dosage, frequency,
 * timing and instructions — is typed by the doctor. The application never generates it.
 */

export type ConsultationStatus = 'IN_PROGRESS' | 'COMPLETED';

/** How long an issued prescription stays valid, unless the doctor sets a date. */
export const PRESCRIPTION_VALIDITY_DAYS = 30;

export interface ClinicalPatientRef {
  id: string;
  name: string;
  avatarUrl: string | null;
  age: number | null;
  gender: Gender | null;
}

export interface ClinicalDoctorRef {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
  primarySpecialty: string;
  qualifications: string;
  registrationNumber: string;
}

export interface PrescriptionItemRecord {
  id: string;
  medicineId: string | null;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  timing: string | null;
  instructions: string | null;
  quantity: number;
  sortOrder: number;
}

export interface PrescriptionItemInput {
  medicineId?: string | null;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  timing?: string | null;
  instructions?: string | null;
  quantity: number;
}

export interface PrescriptionSummary {
  id: string;
  prescriptionNumber: string;
  status: PrescriptionStatus;
  diagnosis: string | null;
  issuedAt: string | null;
  validUntil: string | null;
  createdAt: string;
  itemCount: number;
  consultationId: string | null;
  doctor: ClinicalDoctorRef;
  patient: ClinicalPatientRef;
  organization: { id: string; name: string; slug: string } | null;
}

export interface PrescriptionDetail extends PrescriptionSummary {
  advice: string | null;
  items: PrescriptionItemRecord[];
}

export interface CreatePrescriptionPayload {
  /** Ties the prescription to a consultation; the patient is taken from it when given. */
  consultationId?: string | null;
  patientId?: string;
  diagnosis?: string | null;
  advice?: string | null;
  validUntil?: string | null;
  items: PrescriptionItemInput[];
}

export interface UpdatePrescriptionPayload {
  diagnosis?: string | null;
  advice?: string | null;
  validUntil?: string | null;
  /** When present, replaces the whole item list. */
  items?: PrescriptionItemInput[];
}

export interface ConsultationSummary {
  id: string;
  appointmentId: string;
  status: ConsultationStatus;
  chiefComplaint: string | null;
  diagnosis: string | null;
  startedAt: string;
  completedAt: string | null;
  scheduledStart: string;
  consultationType: ConsultationType;
  patient: ClinicalPatientRef;
  doctor: ClinicalDoctorRef;
  prescriptionId: string | null;
}

/** One line of the patient's past history, shown beside the workspace. */
export interface ConsultationHistoryEntry {
  id: string;
  doctorName: string;
  diagnosis: string | null;
  notes: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface ConsultationDetail extends ConsultationSummary {
  notes: string | null;
  observations: string | null;
  followUpDate: string | null;
  appointment: {
    id: string;
    appointmentNumber: string;
    reason: string | null;
    patientNotes: string | null;
    organizationName: string | null;
  };
  patientContact: { phone: string | null; bloodGroup: string | null };
  /** The draft or issued prescription written during this consultation, if any. */
  prescription: PrescriptionDetail | null;
  previousConsultations: ConsultationHistoryEntry[];
  previousPrescriptions: PrescriptionSummary[];
}

export interface UpdateConsultationPayload {
  chiefComplaint?: string | null;
  notes?: string | null;
  diagnosis?: string | null;
  observations?: string | null;
  followUpDate?: string | null;
}

export type ConsultationScope = 'active' | 'completed' | 'all';

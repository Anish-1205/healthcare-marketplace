import type { Gender } from './catalog';

/** The signed-in patient's editable profile (spec §14). */
export interface PatientProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
}

export interface SavedAddress {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  locality: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

import type { DemoAccount } from './api';

/** Development-only demo password. Hashed with bcrypt by the seed; never stored in plaintext. */
export const DEMO_PASSWORD = 'Demo@123';

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    key: 'patient',
    label: 'Patient Demo',
    email: 'patient@carebridge.demo',
    password: DEMO_PASSWORD,
    role: 'PATIENT',
    description: 'Rahul Verma — books doctors, orders medicines, tracks deliveries',
  },
  {
    key: 'doctor',
    label: 'Doctor Demo',
    email: 'doctor@carebridge.demo',
    password: DEMO_PASSWORD,
    role: 'DOCTOR',
    description: 'Dr. Maya Rao — Dermatologist at Sunrise Family Clinic',
  },
  {
    key: 'clinic',
    label: 'Clinic Demo',
    email: 'clinic@carebridge.demo',
    password: DEMO_PASSWORD,
    role: 'CLINIC_ADMIN',
    description: 'Anita Desai — administrator, Sunrise Family Clinic',
  },
  {
    key: 'hospital',
    label: 'Hospital Demo',
    email: 'hospital@carebridge.demo',
    password: DEMO_PASSWORD,
    role: 'HOSPITAL_ADMIN',
    description: 'Vikram Singh — administrator, Community Health Hospital',
  },
  {
    key: 'pharmacy',
    label: 'Pharmacy Demo',
    email: 'pharmacy@carebridge.demo',
    password: DEMO_PASSWORD,
    role: 'PHARMACY_ADMIN',
    description: 'Suresh Iyer — owner, City Care Pharmacy',
  },
  {
    key: 'employee',
    label: 'Platform Employee Demo',
    email: 'employee@carebridge.demo',
    password: DEMO_PASSWORD,
    role: 'PLATFORM_EMPLOYEE',
    description: 'Divya Menon — operations, reviews provider approvals',
  },
  {
    key: 'admin',
    label: 'Platform Admin Demo',
    email: 'admin@carebridge.demo',
    password: DEMO_PASSWORD,
    role: 'PLATFORM_ADMIN',
    description: 'Arvind Rao — manages the CareBridge marketplace',
  },
  {
    key: 'superadmin',
    label: 'Super Admin Demo',
    email: 'superadmin@carebridge.demo',
    password: DEMO_PASSWORD,
    role: 'SUPER_ADMIN',
    description: 'Full platform access',
  },
];

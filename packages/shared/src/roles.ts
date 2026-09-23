/**
 * Role names mirror the Prisma `RoleName` enum. Keep both in sync.
 */
export const ROLES = [
  'PATIENT',
  'DOCTOR',
  'CLINIC_ADMIN',
  'CLINIC_STAFF',
  'HOSPITAL_ADMIN',
  'HOSPITAL_STAFF',
  'PHARMACY_ADMIN',
  'PHARMACY_STAFF',
  'PLATFORM_EMPLOYEE',
  'PLATFORM_ADMIN',
  'SUPER_ADMIN',
] as const;

export type Role = (typeof ROLES)[number];

export const PLATFORM_ROLES: readonly Role[] = ['PLATFORM_EMPLOYEE', 'PLATFORM_ADMIN', 'SUPER_ADMIN'];
export const CLINIC_ROLES: readonly Role[] = ['CLINIC_ADMIN', 'CLINIC_STAFF'];
export const HOSPITAL_ROLES: readonly Role[] = ['HOSPITAL_ADMIN', 'HOSPITAL_STAFF'];
export const PHARMACY_ROLES: readonly Role[] = ['PHARMACY_ADMIN', 'PHARMACY_STAFF'];
export const ORGANIZATION_ROLES: readonly Role[] = [...CLINIC_ROLES, ...HOSPITAL_ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  PATIENT: 'Patient',
  DOCTOR: 'Doctor',
  CLINIC_ADMIN: 'Clinic Admin',
  CLINIC_STAFF: 'Clinic Staff',
  HOSPITAL_ADMIN: 'Hospital Admin',
  HOSPITAL_STAFF: 'Hospital Staff',
  PHARMACY_ADMIN: 'Pharmacy Admin',
  PHARMACY_STAFF: 'Pharmacy Staff',
  PLATFORM_EMPLOYEE: 'Platform Employee',
  PLATFORM_ADMIN: 'Platform Admin',
  SUPER_ADMIN: 'Super Admin',
};

/** Portal a user lands on after login, by highest-priority role. */
export type Portal = 'patient' | 'doctor' | 'organization' | 'pharmacy' | 'admin';

const PORTAL_PRIORITY: Array<[Role, Portal]> = [
  ['SUPER_ADMIN', 'admin'],
  ['PLATFORM_ADMIN', 'admin'],
  ['PLATFORM_EMPLOYEE', 'admin'],
  ['PHARMACY_ADMIN', 'pharmacy'],
  ['PHARMACY_STAFF', 'pharmacy'],
  ['HOSPITAL_ADMIN', 'organization'],
  ['CLINIC_ADMIN', 'organization'],
  ['HOSPITAL_STAFF', 'organization'],
  ['CLINIC_STAFF', 'organization'],
  ['DOCTOR', 'doctor'],
  ['PATIENT', 'patient'],
];

export function primaryPortal(roles: readonly Role[]): Portal {
  for (const [role, portal] of PORTAL_PRIORITY) {
    if (roles.includes(role)) return portal;
  }
  return 'patient';
}

export function isPlatformRole(role: Role): boolean {
  return PLATFORM_ROLES.includes(role);
}

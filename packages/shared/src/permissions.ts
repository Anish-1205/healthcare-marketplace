import type { Role } from './roles';

/**
 * Permission catalogue. The ROLE_PERMISSIONS matrix below is the single source of truth:
 * the API authorizes against it, and the seed writes it to the `permissions` /
 * `role_permissions` tables so it can be displayed in the admin portal.
 *
 * Permissions answer "may this role perform this kind of action at all".
 * Ownership / tenant checks ("is this *your* appointment / *your* pharmacy") are
 * enforced separately in the API service layer.
 */
export const PERMISSIONS = {
  // Patient self-service
  PATIENT_PROFILE_MANAGE: 'patient.profile.manage',
  APPOINTMENT_BOOK: 'appointment.book',
  APPOINTMENT_READ_OWN: 'appointment.read.own',
  PRESCRIPTION_READ_OWN: 'prescription.read.own',
  CART_MANAGE: 'cart.manage',
  ORDER_CREATE: 'order.create',
  ORDER_READ_OWN: 'order.read.own',
  HEALTH_RECORD_MANAGE_OWN: 'health-record.manage.own',
  REVIEW_CREATE: 'review.create',
  FAVORITE_MANAGE: 'favorite.manage',
  LAB_BOOKING_CREATE: 'lab-booking.create',

  // Doctor
  DOCTOR_PROFILE_MANAGE: 'doctor.profile.manage',
  DOCTOR_AVAILABILITY_MANAGE: 'doctor.availability.manage',
  APPOINTMENT_READ_DOCTOR: 'appointment.read.doctor',
  APPOINTMENT_MANAGE_DOCTOR: 'appointment.manage.doctor',
  CONSULTATION_MANAGE: 'consultation.manage',
  PRESCRIPTION_CREATE: 'prescription.create',
  PATIENT_READ_ASSIGNED: 'patient.read.assigned',

  // Clinic / hospital
  ORGANIZATION_PROFILE_MANAGE: 'organization.profile.manage',
  ORGANIZATION_STAFF_MANAGE: 'organization.staff.manage',
  ORGANIZATION_DOCTOR_MANAGE: 'organization.doctor.manage',
  ORGANIZATION_SERVICE_MANAGE: 'organization.service.manage',
  ORGANIZATION_REPORT_READ: 'organization.report.read',
  APPOINTMENT_READ_ORGANIZATION: 'appointment.read.organization',
  APPOINTMENT_MANAGE_ORGANIZATION: 'appointment.manage.organization',
  PATIENT_READ_ORGANIZATION: 'patient.read.organization',

  // Pharmacy
  PHARMACY_PROFILE_MANAGE: 'pharmacy.profile.manage',
  PHARMACY_STAFF_MANAGE: 'pharmacy.staff.manage',
  INVENTORY_MANAGE: 'inventory.manage',
  ORDER_READ_PHARMACY: 'order.read.pharmacy',
  ORDER_MANAGE_PHARMACY: 'order.manage.pharmacy',
  DELIVERY_MANAGE: 'delivery.manage',
  PHARMACY_REPORT_READ: 'pharmacy.report.read',

  // Platform
  ADMIN_DASHBOARD_READ: 'admin.dashboard.read',
  ADMIN_DATA_READ: 'admin.data.read',
  APPROVAL_MANAGE: 'approval.manage',
  USER_MANAGE: 'user.manage',
  ORGANIZATION_MANAGE: 'organization.manage',
  EMPLOYEE_MANAGE: 'employee.manage',
  REVIEW_MODERATE: 'review.moderate',
  ACTIVITY_LOG_READ: 'activity-log.read',
  SETTINGS_MANAGE: 'settings.manage',
  DEMO_RESET: 'demo.reset',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: readonly Permission[] = Object.values(PERMISSIONS);

const P = PERMISSIONS;

const PATIENT_PERMISSIONS: Permission[] = [
  P.PATIENT_PROFILE_MANAGE,
  P.APPOINTMENT_BOOK,
  P.APPOINTMENT_READ_OWN,
  P.PRESCRIPTION_READ_OWN,
  P.CART_MANAGE,
  P.ORDER_CREATE,
  P.ORDER_READ_OWN,
  P.HEALTH_RECORD_MANAGE_OWN,
  P.REVIEW_CREATE,
  P.FAVORITE_MANAGE,
  P.LAB_BOOKING_CREATE,
];

const ORG_STAFF_PERMISSIONS: Permission[] = [
  P.APPOINTMENT_READ_ORGANIZATION,
  P.APPOINTMENT_MANAGE_ORGANIZATION,
  P.PATIENT_READ_ORGANIZATION,
];

const ORG_ADMIN_PERMISSIONS: Permission[] = [
  ...ORG_STAFF_PERMISSIONS,
  P.ORGANIZATION_PROFILE_MANAGE,
  P.ORGANIZATION_STAFF_MANAGE,
  P.ORGANIZATION_DOCTOR_MANAGE,
  P.ORGANIZATION_SERVICE_MANAGE,
  P.ORGANIZATION_REPORT_READ,
];

const PHARMACY_STAFF_PERMISSIONS: Permission[] = [
  P.INVENTORY_MANAGE,
  P.ORDER_READ_PHARMACY,
  P.ORDER_MANAGE_PHARMACY,
  P.DELIVERY_MANAGE,
];

const PHARMACY_ADMIN_PERMISSIONS: Permission[] = [
  ...PHARMACY_STAFF_PERMISSIONS,
  P.PHARMACY_PROFILE_MANAGE,
  P.PHARMACY_STAFF_MANAGE,
  P.PHARMACY_REPORT_READ,
];

const PLATFORM_EMPLOYEE_PERMISSIONS: Permission[] = [
  P.ADMIN_DASHBOARD_READ,
  P.ADMIN_DATA_READ,
  P.APPROVAL_MANAGE,
  P.REVIEW_MODERATE,
  P.ACTIVITY_LOG_READ,
];

const PLATFORM_ADMIN_PERMISSIONS: Permission[] = [
  ...PLATFORM_EMPLOYEE_PERMISSIONS,
  P.USER_MANAGE,
  P.ORGANIZATION_MANAGE,
  P.EMPLOYEE_MANAGE,
  P.SETTINGS_MANAGE,
  P.DEMO_RESET,
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  PATIENT: PATIENT_PERMISSIONS,
  DOCTOR: [
    P.DOCTOR_PROFILE_MANAGE,
    P.DOCTOR_AVAILABILITY_MANAGE,
    P.APPOINTMENT_READ_DOCTOR,
    P.APPOINTMENT_MANAGE_DOCTOR,
    P.CONSULTATION_MANAGE,
    P.PRESCRIPTION_CREATE,
    P.PATIENT_READ_ASSIGNED,
  ],
  CLINIC_ADMIN: ORG_ADMIN_PERMISSIONS,
  CLINIC_STAFF: ORG_STAFF_PERMISSIONS,
  HOSPITAL_ADMIN: ORG_ADMIN_PERMISSIONS,
  HOSPITAL_STAFF: ORG_STAFF_PERMISSIONS,
  PHARMACY_ADMIN: PHARMACY_ADMIN_PERMISSIONS,
  PHARMACY_STAFF: PHARMACY_STAFF_PERMISSIONS,
  PLATFORM_EMPLOYEE: PLATFORM_EMPLOYEE_PERMISSIONS,
  PLATFORM_ADMIN: PLATFORM_ADMIN_PERMISSIONS,
  SUPER_ADMIN: ALL_PERMISSIONS,
};

export function permissionsForRoles(roles: readonly Role[]): Set<Permission> {
  const result = new Set<Permission>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) result.add(permission);
  }
  return result;
}

export function hasPermission(roles: readonly Role[], permission: Permission): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

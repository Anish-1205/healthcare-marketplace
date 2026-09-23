/**
 * Domain status values. These mirror Prisma enums so the frontend can use them
 * without depending on @prisma/client. Keep in sync with apps/api/prisma/schema.prisma.
 */
export const APPOINTMENT_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_CONSULTATION',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const CONSULTATION_TYPES = ['IN_PERSON', 'VIDEO', 'PHONE'] as const;
export type ConsultationType = (typeof CONSULTATION_TYPES)[number];

export const ORDER_STATUSES = [
  'PENDING',
  'PRESCRIPTION_REVIEW',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REJECTED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PRESCRIPTION_STATUSES = ['DRAFT', 'ISSUED', 'CANCELLED'] as const;
export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number];

export const PAYMENT_METHODS = ['CARD', 'UPI', 'CASH_ON_DELIVERY', 'PAY_AT_CLINIC'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const DELIVERY_STATUSES = ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const APPROVAL_STATUSES = ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const ORGANIZATION_TYPES = ['CLINIC', 'HOSPITAL', 'PHARMACY'] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const LAB_BOOKING_STATUSES = [
  'BOOKED',
  'SAMPLE_COLLECTED',
  'PROCESSING',
  'REPORT_READY',
  'CANCELLED',
] as const;
export type LabBookingStatus = (typeof LAB_BOOKING_STATUSES)[number];

/**
 * Allowed forward transitions for pharmacy order processing.
 * Used by the API to reject invalid status changes and by the UI to render action buttons.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['PRESCRIPTION_REVIEW', 'CONFIRMED', 'REJECTED', 'CANCELLED'],
  PRESCRIPTION_REVIEW: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'],
  READY_FOR_PICKUP: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
};

export const APPOINTMENT_STATUS_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CHECKED_IN', 'IN_CONSULTATION', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['IN_CONSULTATION', 'NO_SHOW'],
  IN_CONSULTATION: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function canTransition<S extends string>(
  transitions: Record<S, readonly S[]>,
  from: S,
  to: S,
): boolean {
  return transitions[from]?.includes(to) ?? false;
}

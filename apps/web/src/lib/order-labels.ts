import type { DeliveryStatus, OrderStatus } from '@carebridge/shared';
export const ORDER_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Order placed',
  PRESCRIPTION_REVIEW: 'Prescription review',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing medicines',
  READY_FOR_PICKUP: 'Ready for pickup',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
};
export const DELIVERY_LABELS: Record<DeliveryStatus, string> = {
  ASSIGNED: 'Agent assigned',
  PICKED_UP: 'Picked up',
  ON_THE_WAY: 'On the way',
  DELIVERED: 'Delivered',
};
export const DELIVERY_NEXT: Record<DeliveryStatus, DeliveryStatus | null> = {
  ASSIGNED: 'PICKED_UP',
  PICKED_UP: 'ON_THE_WAY',
  ON_THE_WAY: 'DELIVERED',
  DELIVERED: null,
};
export const orderTime = (value: string) =>
  new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

import type { CartDetail } from './cart';
import type { DeliveryStatus, OrderStatus, PaymentMethod, PaymentStatus } from './statuses';

export interface DeliveryAddress {
  recipient: string;
  phone: string;
  line1: string;
  line2?: string;
  locality: string;
  city: string;
  postalCode: string;
}
export interface CheckoutPayload {
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  paymentMethod: 'CARD' | 'UPI' | 'CASH_ON_DELIVERY';
  addressId?: string;
  address?: DeliveryAddress;
  prescriptionId?: string;
  patientNotes?: string;
}
export interface CheckoutContext {
  cart: CartDetail;
  platformFee: number;
  addresses: Array<DeliveryAddress & { id: string; label: string }>;
}
export interface OrderItemDetail {
  id: string;
  medicineId: string | null;
  medicineName: string;
  packSize: string | null;
  quantity: number;
  approvedQuantity: number | null;
  requiresPrescription: boolean;
  unitMrp: number;
  unitPrice: number;
  lineTotal: number;
}
export interface OrderPayment {
  id: string;
  transactionRef: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: string | null;
  refundedAt: string | null;
}
export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  pharmacy: { id: string; name: string; phone: string | null; addressLine1: string | null; city: string | null };
  patient: { id: string; name: string };
  prescription: {
    id: string;
    prescriptionNumber: string;
    items: Array<{ medicineName: string; dosage: string; frequency: string; duration: string; quantity: number }>;
  } | null;
  address: DeliveryAddress | null;
  items: OrderItemDetail[];
  subtotalMrp: number;
  discountTotal: number;
  deliveryFee: number;
  platformFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  payments: OrderPayment[];
  patientNotes: string | null;
  pharmacyNotes: string | null;
  rejectionReason: string | null;
  placedAt: string;
  canCancel: boolean;
  allowedStatuses: OrderStatus[];
  statusHistory: Array<{ id: string; toStatus: OrderStatus; note: string | null; createdAt: string }>;
  delivery: {
    id: string;
    agentName: string;
    agentPhone: string;
    vehicleType: string;
    vehicleNumber: string;
    status: DeliveryStatus;
    estimatedArrivalAt: string | null;
    statusHistory: Array<{ id: string; status: DeliveryStatus; note: string | null; createdAt: string }>;
  } | null;
}
export interface OrderStatusPayload {
  status: OrderStatus;
  note?: string;
  items?: Array<{ id: string; approvedQuantity: number; unitPrice: number }>;
}

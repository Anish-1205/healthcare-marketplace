import type { CheckoutContext, CheckoutPayload, DeliveryStatus, OrderDetail, OrderStatus, OrderStatusPayload } from '@carebridge/shared';
import { api } from './client';
export const ordersApi = {
  checkout: () => api.get<CheckoutContext>('/orders/checkout'),
  place: (payload: CheckoutPayload) => api.post<OrderDetail>('/orders', payload),
  list: (page: number, status?: OrderStatus) => api.getPaginated<OrderDetail>('/orders', { params: { page, pageSize: 12, status } }),
  detail: (id: string) => api.get<OrderDetail>(`/orders/${id}`),
  cancel: (id: string, note: string) => api.post<OrderDetail>(`/orders/${id}/cancel`, { note }),
  status: (id: string, payload: OrderStatusPayload) => api.post<OrderDetail>(`/orders/${id}/status`, payload),
  assign: (id: string) => api.post<OrderDetail>(`/orders/${id}/delivery`, {}),
  delivery: (id: string, status: DeliveryStatus) => api.post<OrderDetail>(`/deliveries/${id}/status`, { status }),
};

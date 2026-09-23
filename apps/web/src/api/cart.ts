import type {
  AddCartItemPayload,
  CartDetail,
  CartFromPrescriptionPayload,
  CartFromPrescriptionResult,
  UpdateCartItemPayload,
} from '@carebridge/shared';
import { api } from './client';

export const cartApi = {
  get: () => api.get<CartDetail>('/cart'),
  addItem: (payload: AddCartItemPayload) => api.post<CartDetail>('/cart/items', payload),
  updateItem: (medicineId: string, payload: UpdateCartItemPayload) => api.patch<CartDetail>(`/cart/items/${medicineId}`, payload),
  removeItem: (medicineId: string) => api.del<CartDetail>(`/cart/items/${medicineId}`),
  clear: () => api.del<CartDetail>('/cart'),
  fromPrescription: (payload: CartFromPrescriptionPayload) => api.post<CartFromPrescriptionResult>('/cart/from-prescription', payload),
};

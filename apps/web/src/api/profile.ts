import type { Gender, PatientProfile, SavedAddress } from '@carebridge/shared';
import { api } from './client';

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
}

export type AddressPayload = Omit<SavedAddress, 'id'>;

export const profileApi = {
  get: () => api.get<PatientProfile>('/profile'),
  update: (payload: UpdateProfilePayload) => api.patch<PatientProfile>('/profile', payload),
  addresses: () => api.get<SavedAddress[]>('/profile/addresses'),
  createAddress: (payload: AddressPayload) => api.post<SavedAddress>('/profile/addresses', payload),
  updateAddress: (id: string, payload: AddressPayload) => api.put<SavedAddress>(`/profile/addresses/${id}`, payload),
  deleteAddress: (id: string) => api.del<{ id: string; removed: true }>(`/profile/addresses/${id}`),
};

import type { AuthUser, LoginResponse } from '@carebridge/shared';
import { api } from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPatientPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNDISCLOSED';
}

export const authApi = {
  login: (payload: LoginPayload) => api.post<LoginResponse>('/auth/login', payload),
  register: (payload: RegisterPatientPayload) => api.post<LoginResponse>('/auth/register', payload),
  me: () => api.get<AuthUser>('/auth/me'),
  logout: () => api.post<{ loggedOut: boolean }>('/auth/logout'),
  forgotPassword: (email: string) => api.post<{ message: string; demoResetToken?: string }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post<{ reset: boolean }>('/auth/reset-password', { token, password }),
};

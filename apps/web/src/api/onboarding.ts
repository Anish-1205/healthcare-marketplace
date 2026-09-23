import type { LoginResponse } from '@carebridge/shared';
import { api } from './client';

export const onboardingApi = {
  registerDoctor: (payload: Record<string, unknown>) => api.post<LoginResponse>('/onboarding/doctor', payload),
  registerOrganization: (payload: Record<string, unknown>) => api.post<LoginResponse>('/onboarding/organization', payload),
};

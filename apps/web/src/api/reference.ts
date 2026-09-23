import type { DemoAccount, PublicConfig, SearchResponse } from '@carebridge/shared';
import { api } from './client';

export interface SpecialtyRef {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  doctorCount: number;
}

export interface MedicineCategoryRef {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  colorTheme: string | null;
  imageUrl: string | null;
  description: string | null;
  medicineCount: number;
}

export const referenceApi = {
  config: () => api.get<PublicConfig>('/config'),
  specialties: () => api.get<SpecialtyRef[]>('/specialties'),
  medicineCategories: () => api.get<MedicineCategoryRef[]>('/medicine-categories'),
  search: (q: string, signal?: AbortSignal) => api.get<SearchResponse>('/search', { params: { q }, signal }),
  demoAccounts: () => api.get<DemoAccount[]>('/demo/accounts'),
};

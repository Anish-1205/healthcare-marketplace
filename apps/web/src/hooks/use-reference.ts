import { useQuery } from '@tanstack/react-query';
import { referenceApi } from '@/api/reference';

export function useSpecialties() {
  return useQuery({ queryKey: ['specialties'], queryFn: referenceApi.specialties, staleTime: 10 * 60_000 });
}

export function useMedicineCategories() {
  return useQuery({ queryKey: ['medicine-categories'], queryFn: referenceApi.medicineCategories, staleTime: 10 * 60_000 });
}

export function usePublicConfig() {
  return useQuery({ queryKey: ['config'], queryFn: referenceApi.config, staleTime: 10 * 60_000 });
}

export function useDemoAccounts() {
  return useQuery({ queryKey: ['demo-accounts'], queryFn: referenceApi.demoAccounts, staleTime: Infinity });
}

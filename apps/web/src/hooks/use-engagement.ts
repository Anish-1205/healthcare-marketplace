import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useCurrentUser } from './use-auth';

export type Target = { targetType: 'DOCTOR' | 'ORGANIZATION' | 'CLINIC' | 'HOSPITAL' | 'PHARMACY'; targetId: string };
export type Review = { id: string; rating: number; comment: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; createdAt: string; targetName?: string };
export type Favorite = Target & { id: string; name: string; href: string };
export function useFavorites() {
  const user = useCurrentUser();
  return useQuery({ queryKey: ['favorites', user?.id], queryFn: () => api.get<Favorite[]>('/favorites'), enabled: Boolean(user?.roles.includes('PATIENT')) });
}
export function useToggleFavorite(target: Target, favorite?: Favorite) {
  const client = useQueryClient();
  return useMutation({ mutationFn: () => favorite ? api.del(`/favorites/${favorite.id}`) : api.post('/favorites', target), onSuccess: () => client.invalidateQueries({ queryKey: ['favorites'] }) });
}
export function useReviewEligibility(target: Target) {
  const user = useCurrentUser();
  return useQuery({ queryKey: ['review-eligibility', user?.id, target], queryFn: () => api.get<{ eligible: boolean; review: Review | null }>('/reviews/eligibility', { params: target }), enabled: Boolean(user?.roles.includes('PATIENT')), staleTime: 0 });
}

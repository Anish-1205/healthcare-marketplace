import { Heart } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-auth';
import { useFavorites, useToggleFavorite, type Target } from '@/hooks/use-engagement';
import { Button } from './ui/button';

export function FavoriteButton(target: Target) {
  const user = useCurrentUser();
  const favorites = useFavorites();
  const saved = favorites.data?.find((row) => row.targetId === target.targetId && (row.targetType === 'DOCTOR') === (target.targetType === 'DOCTOR'));
  const toggle = useToggleFavorite(target, saved);
  if (!user?.roles.includes('PATIENT')) return null;
  return <div><Button variant="outline" size="sm" aria-pressed={Boolean(saved)} disabled={favorites.isLoading || favorites.isError || toggle.isPending} onClick={() => toggle.mutate()}><Heart className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />{saved ? 'Unsave' : 'Save'}</Button>{(toggle.isError || favorites.isError) && <p role="alert" className="text-xs text-destructive">{toggle.error?.message ?? 'Could not load favorites.'}</p>}</div>;
}

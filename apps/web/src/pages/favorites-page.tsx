import { Link } from 'react-router-dom';
import { FavoriteButton } from '@/components/favorite-button';
import { useFavorites } from '@/hooks/use-engagement';
import { ErrorState } from '@/components/error-state';

export function FavoritesPage() {
  const query = useFavorites();
  return <div className="container py-8"><h1 className="mb-6 text-2xl font-bold">Favorites</h1>{query.isLoading ? <p>Loading favorites…</p> : query.isError ? <ErrorState message="Could not load favorites." onRetry={() => query.refetch()} /> : !query.data?.length ? <p>No saved providers yet. Save a doctor, clinic, hospital or pharmacy to find them here.</p> : <div className="grid gap-4 md:grid-cols-2">{query.data.map((row) => <article key={row.id} className="flex items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-soft interactive-card"><div><Link className="font-semibold text-primary" to={row.href}>{row.name}</Link><p className="text-sm text-muted-foreground">{row.targetType.toLowerCase()}</p></div><FavoriteButton targetType={row.targetType} targetId={row.targetId} /></article>)}</div>}</div>;
}

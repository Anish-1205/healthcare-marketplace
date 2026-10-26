import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Review } from '@/hooks/use-engagement';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state';

export function AdminReviewsPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'reviews'], queryFn: () => api.get<Review[]>('/admin/reviews') });
  const decide = useMutation({ mutationFn: ({ id, decision }: { id: string; decision: string }) => api.post(`/admin/reviews/${id}/${decision}`), onSuccess: () => client.invalidateQueries() });
  return <div><h1 className="mb-5 text-2xl font-bold">Review moderation</h1>{decide.isError && <p role="alert">{decide.error.message}</p>}{query.isLoading ? <p>Loading reviews…</p> : query.isError ? <ErrorState message="Could not load reviews." onRetry={() => query.refetch()} /> : !query.data?.length ? <p>No reviews to moderate.</p> : <div className="space-y-4">{query.data.map((review) => <article key={review.id} className="rounded-xl border bg-card p-5 shadow-soft interactive-card"><h2 className="font-semibold">{review.targetName}</h2><p>{review.rating}/5 · {review.status.toLowerCase()} · {new Date(review.createdAt).toLocaleDateString()}</p><p className="my-3 whitespace-pre-wrap">{review.comment}</p><div className="flex gap-3"><Button disabled={decide.isPending || review.status === 'APPROVED'} onClick={() => decide.mutate({ id: review.id, decision: 'approve' })}>Approve</Button><Button variant="outline" disabled={decide.isPending || review.status === 'REJECTED'} onClick={() => decide.mutate({ id: review.id, decision: 'reject' })}>Reject</Button></div></article>)}</div>}</div>;
}

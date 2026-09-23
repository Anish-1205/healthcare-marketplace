import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useReviewEligibility, type Target } from '@/hooks/use-engagement';
import { Button } from './ui/button';

export function PatientReview(target: Target) {
  const eligibility = useReviewEligibility(target);
  const client = useQueryClient();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const submit = useMutation({ mutationFn: () => api.post('/reviews', { ...target, rating, text }), onSuccess: () => client.invalidateQueries({ queryKey: ['review-eligibility'] }) });
  if (eligibility.isError) return <p role="alert">Could not check review eligibility. <button onClick={() => eligibility.refetch()}>Retry</button></p>;
  if (eligibility.data?.review) return <div className="my-5 rounded-xl border p-4"><h2 className="font-semibold">Your review</h2><p role="status">Status: {eligibility.data.review.status.toLowerCase()}</p><p>{eligibility.data.review.rating}/5 — {eligibility.data.review.comment}</p></div>;
  if (!eligibility.data?.eligible) return null;
  return <form className="my-5 space-y-3 rounded-xl border p-4" onSubmit={(event) => { event.preventDefault(); submit.mutate(); }}><h2 className="font-semibold">Write a review</h2><label className="block">Rating<select aria-label="Rating" className="ml-3 rounded border p-2" value={rating} onChange={(event) => setRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select></label><label className="block">Your review<textarea className="mt-1 block w-full rounded border bg-background p-3" required maxLength={4000} value={text} onChange={(event) => setText(event.target.value)} /></label><p className="text-sm text-muted-foreground">Your review will be visible after moderation.</p>{submit.isError && <p role="alert" className="text-destructive">{submit.error.message}</p>}<Button disabled={!text.trim() || submit.isPending}>Submit review</Button></form>;
}

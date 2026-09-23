// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PatientReview } from './patient-review';

const mocks = vi.hoisted(() => ({ eligibility: vi.fn(), post: vi.fn() }));
vi.mock('@/hooks/use-engagement', () => ({ useReviewEligibility: mocks.eligibility }));
vi.mock('@/api/client', () => ({ api: { post: mocks.post } }));
let container: HTMLDivElement;
let root: Root;
let client: QueryClient;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  mocks.post.mockReset();
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); client.clear(); });
async function render(data?: unknown) {
  mocks.eligibility.mockReturnValue({ data });
  await act(async () => root.render(<QueryClientProvider client={client}><PatientReview targetType="DOCTOR" targetId="provider-id" /></QueryClientProvider>));
}
it('hides the form from signed-out or ineligible patients', async () => {
  await render(); expect(container.querySelector('form')).toBeNull();
  await render({ eligible: false, review: null }); expect(container.querySelector('form')).toBeNull();
});
it.each(['PENDING', 'APPROVED', 'REJECTED'])('shows %s status instead of accepting a second review', async (status) => {
  await render({ eligible: false, review: { status, rating: 4, comment: 'Helpful care' } });
  expect(container.querySelector('[role="status"]')?.textContent).toContain(status.toLowerCase());
  expect(container.querySelector('form')).toBeNull();
});
it('submits the selected rating and text then refreshes eligibility', async () => {
  mocks.post.mockResolvedValue({ id: 'review-id', status: 'PENDING' });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  await render({ eligible: true, review: null });
  const textarea = container.querySelector('textarea')!;
  const select = container.querySelector('select')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, 'Helpful care');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    select.value = '3'; select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await act(async () => {
    container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  expect(mocks.post).toHaveBeenCalledWith('/reviews', { targetType: 'DOCTOR', targetId: 'provider-id', rating: 3, text: 'Helpful care' });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['review-eligibility'] });
});
it('shows server errors without pretending the review was submitted', async () => {
  mocks.post.mockRejectedValue(new Error('Complete an appointment first.'));
  await render({ eligible: true, review: null });
  await act(async () => {
    container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Complete an appointment first.');
  expect(container.querySelector('form')).not.toBeNull();
});

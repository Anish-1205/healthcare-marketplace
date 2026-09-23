// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SlotPicker } from './slot-picker';

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function render(props: { isError?: boolean; onRetry?: () => void }) {
  await act(async () =>
    root.render(
      <SlotPicker consultationTypes={['IN_PERSON']} selectedDate="2026-09-23" onSelectDate={() => {}} slots={undefined} isLoading={false} selectedSlot={null} onSelectSlot={() => {}} {...props} />,
    ),
  );
}

it('shows a retryable error instead of "no slots" when loading fails', async () => {
  const onRetry = vi.fn();
  await render({ isError: true, onRetry });
  expect(container.textContent).toContain("We couldn't load available times.");
  expect(container.textContent).not.toContain('No available slots');
  const retry = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Try again');
  await act(async () => retry?.click());
  expect(onRetry).toHaveBeenCalledOnce();
});

it('shows the empty message when there is genuinely nothing available', async () => {
  await render({});
  expect(container.textContent).toContain('No available slots on this date.');
});

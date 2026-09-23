import type { PrescriptionStatus } from '@carebridge/shared';

/**
 * Shortcuts offered in the prescription builder. They only save typing — the doctor can type
 * anything they like in these fields, and the application never fills them in on its own.
 */
export const TIMING_SUGGESTIONS = ['Before food', 'After food', 'Morning', 'Afternoon', 'Evening', 'Night', 'Empty stomach'];

export const FREQUENCY_SUGGESTIONS = ['Once daily', 'Twice daily', 'Three times a day', 'Every 6 hours', 'As needed'];

export const DURATION_SUGGESTIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '1 month'];

export const PRESCRIPTION_STATUS_LABELS: Record<PrescriptionStatus, string> = {
  DRAFT: 'Draft',
  ISSUED: 'Issued',
  CANCELLED: 'Cancelled',
};

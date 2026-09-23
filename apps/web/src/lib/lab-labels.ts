import type { LabBookingStatus } from '@carebridge/shared';

export const LAB_STATUS_LABELS: Record<LabBookingStatus, string> = {
  BOOKED: 'Booked', SAMPLE_COLLECTED: 'Sample collected', PROCESSING: 'Processing', REPORT_READY: 'Report ready', CANCELLED: 'Cancelled',
};

export const LAB_STATUS_STEPS: LabBookingStatus[] = ['BOOKED', 'SAMPLE_COLLECTED', 'PROCESSING', 'REPORT_READY'];

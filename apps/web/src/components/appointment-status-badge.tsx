import type { AppointmentStatus } from '@carebridge/shared';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { APPOINTMENT_STATUS_LABELS } from '@/lib/appointment-labels';

const STATUS_VARIANT: Record<AppointmentStatus, NonNullable<BadgeProps['variant']>> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CHECKED_IN: 'accent',
  IN_CONSULTATION: 'default',
  COMPLETED: 'muted',
  CANCELLED: 'destructive',
  NO_SHOW: 'destructive',
};

export function AppointmentStatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className={className}>
      {APPOINTMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

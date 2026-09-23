import { useState } from 'react';
import type { AppointmentSummary, DoctorSettableStatus } from '@carebridge/shared';
import { Building2, Monitor, Phone, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppointmentStatusBadge } from '@/components/appointment-status-badge';
import { ApiError } from '@/api/client';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useUpdateAppointmentStatus } from '@/hooks/use-appointments';
import { CONSULTATION_TYPE_LABELS } from '@/lib/appointment-labels';
import { formatCurrency, formatSlotLabel } from '@/lib/utils';

const TYPE_ICON = { IN_PERSON: User, VIDEO: Monitor, PHONE: Phone };

/** The one-click status moves offered for each status, shown as inline buttons in the row. */
const QUICK_ACTIONS: Partial<Record<AppointmentSummary['status'], Array<{ status: DoctorSettableStatus; label: string; variant: 'default' | 'outline' }>>> = {
  PENDING: [{ status: 'CONFIRMED', label: 'Confirm', variant: 'default' }],
  CONFIRMED: [{ status: 'CHECKED_IN', label: 'Check in', variant: 'default' }],
  CHECKED_IN: [{ status: 'NO_SHOW', label: 'Mark no-show', variant: 'outline' }],
};

/** A single appointment in the doctor's schedule, with same-click confirm/check-in/no-show actions. */
export function DoctorAppointmentRow({ appointment }: { appointment: AppointmentSummary }) {
  const [error, setError] = useState<string | null>(null);
  const updateStatus = useUpdateAppointmentStatus();
  const TypeIcon = TYPE_ICON[appointment.consultationType];
  const actions = QUICK_ACTIONS[appointment.status] ?? [];

  async function runAction(status: DoctorSettableStatus) {
    setError(null);
    try {
      await updateStatus.mutateAsync({ id: appointment.id, status });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That action could not be completed.');
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={`/doctor/appointments/${appointment.id}`} className="flex flex-1 items-center gap-3">
          <Avatar firstName={appointment.patient.name.split(' ')[0]} lastName={appointment.patient.name.split(' ').slice(1).join(' ')} imageUrl={appointment.patient.avatarUrl} />
          <div>
            <p className="font-semibold text-foreground hover:text-primary">{appointment.patient.name}</p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>{formatSlotLabel(appointment.scheduledStart)}</span>
              <span className="flex items-center gap-1">
                <TypeIcon className="h-3.5 w-3.5" /> {CONSULTATION_TYPE_LABELS[appointment.consultationType]}
              </span>
              {appointment.organization && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> {appointment.organization.name}
                </span>
              )}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{formatCurrency(appointment.fee)}</span>
          <AppointmentStatusBadge status={appointment.status} />
        </div>
      </div>

      {(actions.length > 0 || error) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {actions.map((action) => (
            <Button key={action.status} size="sm" variant={action.variant} disabled={updateStatus.isPending} onClick={() => runAction(action.status)}>
              {action.label}
            </Button>
          ))}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}

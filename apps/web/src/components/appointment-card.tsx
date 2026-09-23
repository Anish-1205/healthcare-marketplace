import type { AppointmentSummary } from '@carebridge/shared';
import { Building2, CalendarClock, Monitor, Phone, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppointmentStatusBadge } from '@/components/appointment-status-badge';
import { Avatar } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { CONSULTATION_TYPE_LABELS } from '@/lib/appointment-labels';
import { formatCurrency, formatSlotLabel } from '@/lib/utils';

const TYPE_ICON = { IN_PERSON: User, VIDEO: Monitor, PHONE: Phone };

export function AppointmentCard({ appointment }: { appointment: AppointmentSummary }) {
  const [firstName, ...rest] = appointment.doctor.name.replace('Dr. ', '').split(' ');
  const TypeIcon = TYPE_ICON[appointment.consultationType];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3.5">
          <Avatar firstName={firstName} lastName={rest.join(' ')} imageUrl={appointment.doctor.avatarUrl} />
          <div>
            <Link to={`/doctors/${appointment.doctor.slug}`} className="font-semibold text-foreground hover:text-primary">
              {appointment.doctor.name}
            </Link>
            <p className="text-sm text-muted-foreground">{appointment.doctor.primarySpecialty}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <CalendarClock className="h-4 w-4 text-muted-foreground" /> {formatSlotLabel(appointment.scheduledStart)}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <TypeIcon className="h-4 w-4" /> {CONSULTATION_TYPE_LABELS[appointment.consultationType]}
            </p>
            {appointment.organization && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" /> {appointment.organization.name}
                {appointment.organization.locality ? `, ${appointment.organization.locality}` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <AppointmentStatusBadge status={appointment.status} />
          <span className="text-sm font-semibold text-foreground">{formatCurrency(appointment.fee)}</span>
          <span className="text-xs text-muted-foreground">{appointment.appointmentNumber}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`/appointments/${appointment.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          View details
        </Link>
        {appointment.canReschedule && (
          <Link to={`/appointments/${appointment.id}?action=reschedule`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Reschedule
          </Link>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { AvailableSlot } from '@carebridge/shared';
import { Building2, CalendarClock, CheckCircle2, MapPin, Phone, Receipt } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { AppointmentStatusBadge } from '@/components/appointment-status-badge';
import { ErrorState } from '@/components/error-state';
import { SlotPicker } from '@/components/slot-picker';
import { Avatar } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppointment, useCancelAppointment, useRescheduleAppointment } from '@/hooks/use-appointments';
import { useDoctorSlots } from '@/hooks/use-doctors';
import { APPOINTMENT_STATUS_LABELS, CONSULTATION_TYPE_LABELS } from '@/lib/appointment-labels';
import { formatCurrency, formatSlotLabel } from '@/lib/utils';

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const justBooked = Boolean((location.state as { justBooked?: boolean } | null)?.justBooked);

  const { data: appointment, isLoading, isError, refetch } = useAppointment(id);
  const cancel = useCancelAppointment();
  const reschedule = useRescheduleAppointment();

  const [isRescheduling, setIsRescheduling] = useState(searchParams.get('action') === 'reschedule');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [actionError, setActionError] = useState<string | null>(null);

  const slots = useDoctorSlots(isRescheduling ? appointment?.doctor.id : undefined, selectedDate);

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (isError || !appointment) {
    return (
      <div className="container py-8">
        <ErrorState message="We couldn't load this appointment." onRetry={() => refetch()} />
      </div>
    );
  }

  const [firstName, ...rest] = appointment.doctor.name.replace('Dr. ', '').split(' ');

  async function submitCancel() {
    setActionError(null);
    try {
      await cancel.mutateAsync({ id: id!, reason: cancelReason.trim() || undefined });
      setIsCancelling(false);
      setCancelReason('');
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'We could not cancel this appointment.');
    }
  }

  async function submitReschedule() {
    if (!selectedSlot) return;
    setActionError(null);
    try {
      await reschedule.mutateAsync({
        id: id!,
        scheduledStart: selectedSlot.start,
        organizationId: selectedSlot.organizationId,
        consultationType: selectedSlot.consultationTypes[0],
      });
      closeReschedule();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'We could not move this appointment.');
      setSelectedSlot(null);
      slots.refetch();
    }
  }

  function closeReschedule() {
    setIsRescheduling(false);
    setSelectedSlot(null);
    if (searchParams.has('action')) {
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }

  return (
    <div className="container py-8">
      {justBooked && appointment.status !== 'CANCELLED' && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-secondary/30 bg-secondary/10 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
          <div>
            <p className="font-semibold text-foreground">
              {appointment.status === 'CONFIRMED' ? 'Your appointment is confirmed' : 'Your appointment request has been sent'}
            </p>
            <p className="text-sm text-muted-foreground">
              {appointment.status === 'CONFIRMED'
                ? `We've notified ${appointment.doctor.name}. You'll find this booking under My Appointments.`
                : `${appointment.doctor.name}'s clinic will confirm your request shortly.`}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex gap-4">
                <Avatar firstName={firstName} lastName={rest.join(' ')} imageUrl={appointment.doctor.avatarUrl} size="lg" />
                <div>
                  <Link to={`/doctors/${appointment.doctor.slug}`} className="text-xl font-bold text-foreground hover:text-primary">
                    {appointment.doctor.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{appointment.doctor.primarySpecialty}</p>
                  <p className="text-sm text-muted-foreground">{appointment.doctor.qualifications}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <AppointmentStatusBadge status={appointment.status} />
                <span className="text-xs text-muted-foreground">{appointment.appointmentNumber}</span>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">When</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-semibold text-foreground">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" /> {formatSlotLabel(appointment.scheduledStart)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Consultation type</dt>
                <dd className="mt-0.5 font-semibold text-foreground">{CONSULTATION_TYPE_LABELS[appointment.consultationType]}</dd>
              </div>
              {appointment.organization && (
                <>
                  <div>
                    <dt className="text-sm text-muted-foreground">Where</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5 font-semibold text-foreground">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <Link to={`/organizations/${appointment.organization.slug}`} className="hover:text-primary">
                        {appointment.organization.name}
                      </Link>
                    </dd>
                    {appointment.organization.addressLine1 && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" /> {appointment.organization.addressLine1}
                        {appointment.organization.locality ? `, ${appointment.organization.locality}` : ''}
                      </p>
                    )}
                  </div>
                  {appointment.organization.phone && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Clinic phone</dt>
                      <dd className="mt-0.5 flex items-center gap-1.5 font-semibold text-foreground">
                        <Phone className="h-4 w-4 text-muted-foreground" /> {appointment.organization.phone}
                      </dd>
                    </div>
                  )}
                </>
              )}
              {appointment.reason && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">Reason for consultation</dt>
                  <dd className="mt-0.5 text-foreground">{appointment.reason}</dd>
                </div>
              )}
              {appointment.cancellationReason && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">Cancellation reason</dt>
                  <dd className="mt-0.5 text-foreground">{appointment.cancellationReason}</dd>
                </div>
              )}
            </dl>

            {(appointment.canCancel || appointment.canReschedule) && (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
                {appointment.canReschedule && !isRescheduling && (
                  <Button variant="outline" size="sm" onClick={() => setIsRescheduling(true)}>
                    Reschedule
                  </Button>
                )}
                {appointment.canCancel && !isCancelling && (
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setIsCancelling(true)}>
                    Cancel appointment
                  </Button>
                )}
              </div>
            )}

            {actionError && <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>}

            {isCancelling && (
              <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-sm font-semibold text-foreground">Cancel this appointment?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {appointment.payment?.status === 'PAID'
                    ? 'Your simulated payment will be marked as refunded.'
                    : 'The doctor will be notified straight away.'}
                </p>
                <textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Reason (optional)"
                  className="mt-3 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="destructive" disabled={cancel.isPending} onClick={submitCancel}>
                    {cancel.isPending ? 'Cancelling…' : 'Yes, cancel'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsCancelling(false)}>
                    Keep appointment
                  </Button>
                </div>
              </div>
            )}

            {isRescheduling && (
              <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
                <p className="mb-3 text-sm font-semibold text-foreground">Pick a new time with {appointment.doctor.name}</p>
                <SlotPicker
                  consultationTypes={[appointment.consultationType]}
                  selectedDate={selectedDate}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                  slots={slots.data}
                  isLoading={slots.isLoading}
                  isError={slots.isError}
                  onRetry={() => slots.refetch()}
                  selectedSlot={selectedSlot}
                  onSelectSlot={setSelectedSlot}
                />
                <div className="mt-4 flex gap-2">
                  <Button size="sm" disabled={!selectedSlot || reschedule.isPending} onClick={submitReschedule}>
                    {reschedule.isPending ? 'Moving…' : 'Confirm new time'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={closeReschedule}>
                    Keep current time
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Moved {appointment.rescheduleCount} time{appointment.rescheduleCount === 1 ? '' : 's'} so far. The consultation fee stays the same.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">Appointment timeline</h2>
            <ol className="space-y-4">
              {appointment.statusHistory.map((event) => (
                <li key={event.id} className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{APPOINTMENT_STATUS_LABELS[event.toStatus]}</p>
                    {event.note && <p className="text-sm text-muted-foreground">{event.note}</p>}
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Receipt className="h-4 w-4" /> Payment
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Consultation fee</dt>
                <dd className="font-semibold text-foreground">{formatCurrency(appointment.fee)}</dd>
              </div>
              {appointment.payment && (
                <>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Method</dt>
                    <dd className="text-right font-semibold text-foreground">
                      {appointment.payment.method === 'PAY_AT_CLINIC' ? 'Pay at clinic' : appointment.payment.methodDetail ?? appointment.payment.method}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="font-semibold text-foreground">{appointment.payment.status}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Reference</dt>
                    <dd className="font-mono text-xs text-muted-foreground">{appointment.payment.transactionRef}</dd>
                  </div>
                </>
              )}
            </dl>
            <p className="text-xs text-muted-foreground">Payments in this demo are simulated — no money moves.</p>

            <div className="border-t border-border pt-4">
              <Link to="/appointments" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'w-full' })}>
                All appointments
              </Link>
              <button onClick={() => navigate(`/doctors/${appointment.doctor.slug}`)} className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'mt-2 w-full' })}>
                Book again
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

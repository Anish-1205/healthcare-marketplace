import { useState } from 'react';
import type { AppointmentPaymentMethod, AvailableSlot } from '@carebridge/shared';
import { Banknote, Building2, CreditCard, Smartphone } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { ErrorState } from '@/components/error-state';
import { SlotPicker } from '@/components/slot-picker';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBookAppointment } from '@/hooks/use-appointments';
import { useDoctor, useDoctorSlots } from '@/hooks/use-doctors';
import { CONSULTATION_TYPE_LABELS } from '@/lib/appointment-labels';
import { formatCurrency, formatSlotLabel } from '@/lib/utils';

const PAYMENT_METHODS: Array<{ value: AppointmentPaymentMethod; label: string; hint: string; icon: typeof CreditCard }> = [
  { value: 'UPI', label: 'UPI', hint: 'Pay now — simulated', icon: Smartphone },
  { value: 'CARD', label: 'Card', hint: 'Pay now — simulated', icon: CreditCard },
  { value: 'PAY_AT_CLINIC', label: 'Pay at clinic', hint: 'Confirmed by the clinic', icon: Banknote },
];

/** Step 2 of booking: confirm the slot, add a reason and choose a (simulated) payment method. */
export function BookAppointmentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const preselected = (location.state as { slot?: AvailableSlot; reason?: string } | null) ?? null;

  const { data: doctor, isLoading, isError, refetch } = useDoctor(id);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(preselected?.slot ?? null);
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date(preselected?.slot?.start ?? Date.now()).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
  );
  const [reason, setReason] = useState(preselected?.reason ?? '');
  const [paymentMethod, setPaymentMethod] = useState<AppointmentPaymentMethod>('UPI');
  const [serverError, setServerError] = useState<string | null>(null);

  const slots = useDoctorSlots(id, selectedDate);
  const book = useBookAppointment();

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (isError || !doctor) {
    return (
      <div className="container py-8">
        <ErrorState message="We couldn't find this doctor." onRetry={() => refetch()} />
      </div>
    );
  }

  const [firstName, ...rest] = doctor.name.replace('Dr. ', '').split(' ');
  const consultationType = selectedSlot?.consultationTypes[0] ?? doctor.consultationTypes[0];
  const fee = doctor.organizations.find((org) => org.organizationId === selectedSlot?.organizationId)?.consultationFee ?? doctor.consultationFee;

  async function confirmBooking() {
    if (!selectedSlot || !doctor) return;
    setServerError(null);
    try {
      const appointment = await book.mutateAsync({
        doctorId: doctor.id,
        organizationId: selectedSlot.organizationId,
        consultationType: selectedSlot.consultationTypes[0],
        scheduledStart: selectedSlot.start,
        reason: reason.trim() || undefined,
        paymentMethod,
      });
      navigate(`/appointments/${appointment.id}`, { replace: true, state: { justBooked: true } });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'We could not complete your booking. Please try again.');
      // A taken slot is the common case — refresh what is still free.
      setSelectedSlot(null);
      slots.refetch();
    }
  }

  return (
    <div className="container py-8">
      <h1 className="font-display text-3xl font-normal text-foreground sm:text-4xl">Book an appointment</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Confirm your slot and payment. Payments in this demo are simulated.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">1. Choose a time</h2>
            <SlotPicker
              consultationTypes={doctor.consultationTypes}
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
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-1 text-base font-semibold text-foreground">2. Reason for consultation</h2>
            <p className="mb-3 text-sm text-muted-foreground">Optional, but it helps the doctor prepare.</p>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. Recurring headaches for the past two weeks"
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">3. Payment</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={`flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left ${
                    paymentMethod === method.value ? 'border-primary bg-accent text-accent-foreground' : 'border-border interactive-row'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <method.icon className="h-4 w-4" /> {method.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{method.hint}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar firstName={firstName} lastName={rest.join(' ')} imageUrl={doctor.avatarUrl} />
              <div>
                <p className="font-semibold text-foreground">{doctor.name}</p>
                <p className="text-sm text-muted-foreground">{doctor.primarySpecialty}</p>
              </div>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">When</dt>
                <dd className="text-right font-semibold text-foreground">
                  {selectedSlot ? formatSlotLabel(selectedSlot.start) : 'Choose a slot'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="text-right font-semibold text-foreground">{CONSULTATION_TYPE_LABELS[consultationType]}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Where</dt>
                <dd className="flex items-center gap-1.5 text-right font-semibold text-foreground">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {selectedSlot?.organizationName ?? doctor.organizations[0]?.organizationName ?? 'Online consultation'}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-3">
                <dt className="font-semibold text-foreground">Total</dt>
                <dd className="text-right text-lg font-bold text-foreground">{formatCurrency(fee)}</dd>
              </div>
            </dl>

            {serverError && <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>}

            <Button className="mt-5 w-full" disabled={!selectedSlot || book.isPending} onClick={confirmBooking}>
              {book.isPending ? 'Confirming…' : paymentMethod === 'PAY_AT_CLINIC' ? 'Request appointment' : `Pay ${formatCurrency(fee)} & confirm`}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {paymentMethod === 'PAY_AT_CLINIC'
                ? 'The clinic confirms your request and you pay at the reception.'
                : 'No real payment is taken — this is a demonstration.'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { FavoriteButton } from '@/components/favorite-button';
import { PatientReview } from '@/components/patient-review';
import type { AvailableSlot } from '@carebridge/shared';
import { Building2, Globe, GraduationCap, MessageSquareText } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state';
import { RatingStars } from '@/components/rating-stars';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoctor, useDoctorSlots } from '@/hooks/use-doctors';
import { SlotPicker } from '@/components/slot-picker';
import { cn, formatCurrency, formatSlotLabel } from '@/lib/utils';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: doctor, isLoading, isError, refetch } = useDoctor(id);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [reason, setReason] = useState('');
  const slots = useDoctorSlots(id, selectedDate);

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-64 w-full" />
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

  // The booking page re-validates the slot, so it only needs the selection as a starting point.
  function confirmSelection() {
    navigate(`/doctors/${doctor!.slug}/book`, { state: { slot: selectedSlot, reason } });
  }

  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-3"><FavoriteButton targetType="DOCTOR" targetId={doctor.id} /><PatientReview key={doctor.id} targetType="DOCTOR" targetId={doctor.id} /></div>
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row">
              <Avatar firstName={firstName} lastName={rest.join(' ')} imageUrl={doctor.avatarUrl} size="lg" className="h-24 w-24 text-2xl" />
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">{doctor.name}</h1>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <GraduationCap className="h-4 w-4" /> {doctor.qualifications}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {doctor.specialties.map((s) => (
                    <Badge key={s} variant="accent">
                      {s}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                  <RatingStars rating={doctor.avgRating} />
                  <span className="text-muted-foreground">{doctor.reviewCount} reviews</span>
                  <span className="text-muted-foreground">{doctor.experienceYears} years experience</span>
                </div>
                {doctor.languages.length > 0 && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4" /> {doctor.languages.join(', ')}
                  </p>
                )}
              </div>
            </div>

            {doctor.bio && <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{doctor.bio}</p>}

            {doctor.organizations.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold text-foreground">Practices at</h3>
                <div className="flex flex-col gap-2">
                  {doctor.organizations.map((org) => (
                    <Link
                      key={org.organizationId}
                      to={`/organizations/${org.organizationSlug}`}
                      className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-muted"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Building2 className="h-4 w-4 text-muted-foreground" /> {org.organizationName}
                        {org.isPrimary && (
                          <Badge variant="secondary" className="ml-1">
                            Primary
                          </Badge>
                        )}
                      </span>
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(org.consultationFee)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {doctor.availability.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold text-foreground">Weekly Availability</h3>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {doctor.availability.map((window, i) => (
                    <div key={i} className="flex justify-between rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{WEEKDAYS[window.dayOfWeek]}</span>
                      <span>
                        {window.startTime} - {window.endTime} · {window.organizationName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <MessageSquareText className="h-5 w-5" /> Patient Reviews
            </h3>
            {doctor.reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              <div className="space-y-4">
                {doctor.reviews.map((review) => (
                  <div key={review.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Avatar firstName={review.patientName} imageUrl={review.patientAvatarUrl} size="sm" />
                        <span className="text-sm font-semibold text-foreground">{review.patientName}</span>
                      </div>
                      <RatingStars rating={review.rating} showValue={false} />
                    </div>
                    {review.comment && <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-1 text-base font-semibold text-foreground">Book an Appointment</h3>
            <p className="mb-4 text-sm text-muted-foreground">{formatCurrency(doctor.consultationFee)} consultation fee</p>

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

            {selectedSlot && (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-accent-foreground">Selected: {formatSlotLabel(selectedSlot.start)}</div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for consultation (optional)"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button className={cn('w-full')} onClick={confirmSelection}>
                  Continue
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

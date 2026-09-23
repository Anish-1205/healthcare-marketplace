import { Bed, Building2, Clock, MapPin, Phone, Siren } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { DoctorCard } from '@/components/doctor-card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { RatingStars } from '@/components/rating-stars';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization } from '@/hooks/use-organizations';
import { avatarHue, formatCurrency, formatDistance } from '@/lib/utils';

export function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: org, isLoading, isError, refetch } = useOrganization(id);

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }
  if (isError || !org) {
    return (
      <div className="container py-8">
        <ErrorState message="We couldn't find this organization." onRetry={() => refetch()} />
      </div>
    );
  }
  const hue = avatarHue(org.name);

  return (
    <div className="container py-8">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          {org.logoUrl ? (
            <img src={org.logoUrl} alt={org.name} className="h-20 w-20 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: `linear-gradient(135deg, hsl(${hue} 60% 46%), hsl(${(hue + 30) % 360} 60% 40%))` }}>
              <Building2 className="h-9 w-9" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
              <Badge variant={org.isOpenNow ? 'success' : 'muted'}>{org.isOpenNow ? 'Open Now' : 'Closed'}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{org.category}</p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
              <RatingStars rating={org.avgRating} />
              <span className="text-muted-foreground">{org.reviewCount} reviews</span>
              <span className="font-medium text-foreground">{org.doctorCount} Doctors</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              {org.addressLine1 && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {[org.addressLine1, org.locality].filter(Boolean).join(', ')}
                  {org.distanceKm !== null && ` · ${formatDistance(org.distanceKm)}`}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {org.hoursLabel}
              </span>
              {org.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4" /> {org.phone}
                </span>
              )}
              {org.bedCount && (
                <span className="flex items-center gap-1.5">
                  <Bed className="h-4 w-4" /> {org.bedCount} Beds
                </span>
              )}
              {org.emergencyAvailable && (
                <span className="flex items-center gap-1.5 font-medium text-destructive">
                  <Siren className="h-4 w-4" /> 24x7 Emergency
                </span>
              )}
            </div>
          </div>
        </div>
        {org.description && <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{org.description}</p>}
        {org.specialties.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {org.specialties.map((s) => (
              <Badge key={s} variant="accent">
                {s}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {org.services.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Services</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {org.services.map((service) => (
              <div key={service.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3.5">
                <div>
                  <p className="text-sm font-semibold text-foreground">{service.name}</p>
                  {service.description && <p className="mt-0.5 text-xs text-muted-foreground">{service.description}</p>}
                </div>
                {service.price !== null && <span className="shrink-0 text-sm font-semibold text-foreground">{formatCurrency(service.price)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Doctors at {org.name}</h2>
        {org.doctors.length === 0 ? (
          <EmptyState icon={Building2} title="No doctors listed yet" />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {org.doctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Patient Reviews</h2>
        {org.reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {org.reviews.map((review) => (
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
  );
}

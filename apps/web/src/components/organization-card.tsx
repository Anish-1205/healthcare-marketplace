import type { OrganizationSummary } from '@carebridge/shared';
import { Building2, Clock, MapPin, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { RatingStars } from '@/components/rating-stars';
import { avatarHue, cn, formatDistance } from '@/lib/utils';

export function OrganizationCard({ organization, className }: { organization: OrganizationSummary; className?: string }) {
  const isPharmacy = organization.type === 'PHARMACY';
  const detailHref = isPharmacy ? `/pharmacies/${organization.slug}` : `/organizations/${organization.slug}`;
  const hue = avatarHue(organization.name);

  return (
    <div className={cn('flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md', className)}>
      <div className="flex items-start gap-3">
        {organization.logoUrl ? (
          <img src={organization.logoUrl} alt={organization.name} className="h-12 w-12 rounded-xl object-cover" />
        ) : (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: `linear-gradient(135deg, hsl(${hue} 60% 46%), hsl(${(hue + 30) % 360} 60% 40%))` }}
          >
            <Building2 className="h-5.5 w-5.5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link to={detailHref} className="block truncate text-base font-semibold text-foreground hover:text-primary">
            {organization.name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{organization.category ?? organization.type}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {organization.locality && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {organization.locality}
            {organization.distanceKm !== null && ` · ${formatDistance(organization.distanceKm)}`}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {organization.hoursLabel}
        </span>
      </div>

      {!isPharmacy && (
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <span className="font-semibold text-foreground">{organization.doctorCount} Doctors</span>
          {organization.specialties.length > 0 && <span className="text-muted-foreground">{organization.specialties.length} Specialties</span>}
        </div>
      )}

      {isPharmacy && (
        <div className="mt-3 flex flex-col gap-1.5 text-sm">
          {organization.deliveryAvailable && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Truck className="h-3.5 w-3.5 text-secondary" />
              {organization.deliveryEtaMinMinutes && organization.deliveryEtaMaxMinutes
                ? `${organization.deliveryEtaMinMinutes}-${organization.deliveryEtaMaxMinutes} Minute Delivery`
                : 'Delivery Available'}
            </span>
          )}
          {organization.acceptsPrescriptions && (
            <Badge variant="success" className="w-fit">
              Prescription Orders Accepted
            </Badge>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <RatingStars rating={organization.avgRating} showValue={false} />
        <Badge variant={organization.isOpenNow ? 'success' : 'muted'}>{organization.isOpenNow ? 'Open' : 'Closed'}</Badge>
      </div>

      <Link to={detailHref} className={cn(buttonVariants({ variant: isPharmacy ? 'default' : 'outline', size: 'sm' }), 'mt-4 w-full')}>
        {isPharmacy ? 'Select Pharmacy' : 'View Details'}
      </Link>
    </div>
  );
}

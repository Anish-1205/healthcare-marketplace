import { RevealCard } from '@/components/motion';
import type { DoctorSummary } from '@carebridge/shared';
import { FavoriteButton } from './favorite-button';
import { Building2, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { RatingStars } from '@/components/rating-stars';
import { cn, formatCurrency, formatSlotLabel } from '@/lib/utils';

export function DoctorCard({ doctor, className }: { doctor: DoctorSummary; className?: string }) {
  const [firstName, ...rest] = doctor.name.replace('Dr. ', '').split(' ');
  return (
    <RevealCard className="h-full">
    <div className={cn('flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-soft interactive-card', className)}>
      <div className="flex items-start gap-3">
        <Avatar firstName={firstName} lastName={rest.join(' ')} imageUrl={doctor.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <Link to={`/doctors/${doctor.slug}`} className="block truncate text-base font-semibold text-foreground hover:text-primary">
            {doctor.name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{doctor.qualifications}</p>
          <Badge variant="accent" className="mt-1.5">
            {doctor.primarySpecialty}
          </Badge>
        </div>
      </div>

      <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
        <p>{doctor.experienceYears} Years Experience</p>
        {doctor.primaryOrganization && (
          <p className="flex items-center gap-1.5 truncate">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{doctor.primaryOrganization.name}</span>
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{formatCurrency(doctor.consultationFee)} Consultation</span>
        <RatingStars rating={doctor.avgRating} showValue={false} />
      </div>

      <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs">
        <Calendar className="h-3.5 w-3.5 text-secondary" />
        {doctor.nextAvailableSlot ? (
          <span className="font-medium text-foreground">Next available: {formatSlotLabel(doctor.nextAvailableSlot.start)}</span>
        ) : (
          <span className="text-muted-foreground">No upcoming slots</span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <FavoriteButton targetType="DOCTOR" targetId={doctor.id} />
        <Link to={`/doctors/${doctor.slug}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-w-[7.5rem] flex-1')}>
          View Profile
        </Link>
        <Link to={`/doctors/${doctor.slug}?book=1`} className={cn(buttonVariants({ size: 'sm' }), 'min-w-[9.5rem] flex-1')}>
          Book Appointment
        </Link>
      </div>
    </div>
    </RevealCard>
  );
}

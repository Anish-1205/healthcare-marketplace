import { Clock, MapPin, Phone, Store, Truck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state';
import { MedicineCard } from '@/components/medicine-card';
import { RatingStars } from '@/components/rating-stars';
import { Skeleton } from '@/components/ui/skeleton';
import { useMedicines } from '@/hooks/use-medicines';
import { usePharmacy } from '@/hooks/use-pharmacies';
import { useCart } from '@/hooks/use-cart';
import { avatarHue, formatDistance } from '@/lib/utils';

export function PharmacyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: pharmacy, isLoading, isError, refetch } = usePharmacy(id);
  const medicines = useMedicines({ pharmacyId: pharmacy?.id, pageSize: 12 });
  const { data: cart } = useCart();

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }
  if (isError || !pharmacy) {
    return (
      <div className="container py-8">
        <ErrorState message="We couldn't find this pharmacy." onRetry={() => refetch()} />
      </div>
    );
  }

  const hue = avatarHue(pharmacy.name);
  const isSelected = cart?.pharmacy?.id === pharmacy.id;

  function selectPharmacy() {
    // Browsing here doesn't touch the cart — a mismatch is only ever resolved (with confirmation)
    // at the moment something is actually added, in `useAddToCart`.
    navigate(`/medicines?pharmacyId=${pharmacy!.id}`);
  }

  return (
    <div className="container py-8">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          {pharmacy.logoUrl ? (
            <img src={pharmacy.logoUrl} alt={pharmacy.name} className="h-20 w-20 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: `linear-gradient(135deg, hsl(${hue} 60% 46%), hsl(${(hue + 30) % 360} 60% 40%))` }}>
              <Store className="h-9 w-9" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{pharmacy.name}</h1>
              <Badge variant={pharmacy.isOpenNow ? 'success' : 'muted'}>{pharmacy.isOpenNow ? 'Open Now' : 'Closed'}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{pharmacy.category}</p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
              <RatingStars rating={pharmacy.avgRating} />
              <span className="text-muted-foreground">{pharmacy.reviewCount} reviews</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              {pharmacy.addressLine1 && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {[pharmacy.addressLine1, pharmacy.locality].filter(Boolean).join(', ')}
                  {pharmacy.distanceKm !== null && ` · ${formatDistance(pharmacy.distanceKm)}`}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {pharmacy.hoursLabel}
              </span>
              {pharmacy.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4" /> {pharmacy.phone}
                </span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {pharmacy.deliveryAvailable && (
                <Badge variant="success">
                  <Truck className="h-3 w-3" />
                  {pharmacy.deliveryEtaMinMinutes && pharmacy.deliveryEtaMaxMinutes ? `${pharmacy.deliveryEtaMinMinutes}-${pharmacy.deliveryEtaMaxMinutes} min delivery` : 'Delivery available'}
                </Badge>
              )}
              {pharmacy.pickupAvailable && <Badge variant="outline">Store Pickup</Badge>}
              {pharmacy.acceptsPrescriptions && <Badge variant="outline">Prescription Orders Accepted</Badge>}
            </div>
          </div>
        </div>
        {pharmacy.description && <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{pharmacy.description}</p>}
        <Button className="mt-5 w-full sm:w-auto" onClick={selectPharmacy}>
          {isSelected ? 'Shopping from this pharmacy' : 'Select This Pharmacy'}
        </Button>
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Available Medicines</h2>
        {medicines.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : !medicines.data?.data.length ? (
          <p className="text-sm text-muted-foreground">No medicines listed for this pharmacy yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {medicines.data.data.map((medicine) => (
              <MedicineCard key={medicine.id} medicine={medicine} pharmacyId={pharmacy.id} />
            ))}
          </div>
        )}
      </div>

      {pharmacy.reviews.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Customer Reviews</h2>
          <div className="space-y-4">
            {pharmacy.reviews.map((review) => (
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
        </div>
      )}
    </div>
  );
}

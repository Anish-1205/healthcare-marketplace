import { useEffect, useState } from 'react';
import type { ConsultationType } from '@carebridge/shared';
import { Building2, ImageOff } from 'lucide-react';
import { ApiError } from '@/api/client';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { RatingStars } from '@/components/rating-stars';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useSpecialties } from '@/hooks/use-reference';
import { useDoctorProfile, useUpdateDoctorProfile } from '@/hooks/use-doctor-portal';
import { CONSULTATION_TYPE_LABELS } from '@/lib/appointment-labels';
import { cn, formatCurrency } from '@/lib/utils';

const MAX_SPECIALTIES = 3;

export function DoctorProfilePage() {
  const { data: profile, isLoading, isError, refetch } = useDoctorProfile();
  const specialties = useSpecialties();
  const update = useUpdateDoctorProfile();

  const [bio, setBio] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);
  const [languages, setLanguages] = useState('');
  const [consultationFee, setConsultationFee] = useState(0);
  const [consultationTypes, setConsultationTypes] = useState<ConsultationType[]>([]);
  const [specialtySlugs, setSpecialtySlugs] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio ?? '');
    setQualifications(profile.qualifications);
    setExperienceYears(profile.experienceYears);
    setLanguages(profile.languages.join(', '));
    setConsultationFee(profile.consultationFee);
    setConsultationTypes(profile.consultationTypes);
    setSpecialtySlugs(profile.specialties.map((s) => s.slug));
    setAvatarUrl(profile.avatarUrl ?? '');
  }, [profile]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !profile) return <ErrorState message="We couldn't load your profile." onRetry={() => refetch()} />;

  function toggleConsultationType(type: ConsultationType) {
    setSaved(false);
    setConsultationTypes((prev) => (prev.includes(type) ? (prev.length > 1 ? prev.filter((t) => t !== type) : prev) : [...prev, type]));
  }

  function toggleSpecialty(slug: string) {
    setSaved(false);
    setSpecialtySlugs((prev) => {
      if (prev.includes(slug)) return prev.length > 1 ? prev.filter((s) => s !== slug) : prev;
      if (prev.length >= MAX_SPECIALTIES) return prev;
      return [...prev, slug];
    });
  }

  async function handleSave() {
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync({
        bio: bio.trim() || null,
        qualifications: qualifications.trim(),
        experienceYears,
        languages: languages
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean),
        consultationFee,
        consultationTypes,
        specialties: specialtySlugs,
        avatarUrl: avatarUrl.trim() || null,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not save your profile.');
    }
  }

  const [firstName, ...rest] = [profile.firstName, profile.lastName];

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Patients see this on your public listing once you're approved." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">Photo</h2>
            <div className="flex items-center gap-4">
              <Avatar firstName={firstName} lastName={rest.join(' ')} imageUrl={avatarUrl || null} size="lg" />
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="avatarUrl">Photo URL</Label>
                <Input id="avatarUrl" value={avatarUrl} onChange={(e) => { setAvatarUrl(e.target.value); setSaved(false); }} placeholder="https://…" />
              </div>
              {avatarUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setAvatarUrl(''); setSaved(false); }}>
                  <ImageOff className="h-4 w-4" /> Clear
                </Button>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">About</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="bio">Biography</Label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => { setBio(e.target.value); setSaved(false); }}
                  rows={4}
                  maxLength={2000}
                  className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="qualifications">Qualifications</Label>
                  <Input id="qualifications" value={qualifications} onChange={(e) => { setQualifications(e.target.value); setSaved(false); }} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="experienceYears">Years of experience</Label>
                  <Input id="experienceYears" type="number" min={0} max={60} value={experienceYears} onChange={(e) => { setExperienceYears(Number(e.target.value)); setSaved(false); }} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="languages">Languages (comma separated)</Label>
                  <Input id="languages" value={languages} onChange={(e) => { setLanguages(e.target.value); setSaved(false); }} placeholder="English, Hindi, Kannada" />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-1 text-base font-semibold text-foreground">Specialties</h2>
            <p className="mb-3 text-sm text-muted-foreground">Choose up to {MAX_SPECIALTIES}. The first one you pick is shown as your primary specialty.</p>
            <div className="flex flex-wrap gap-2">
              {specialties.data?.map((specialty) => (
                <button
                  key={specialty.slug}
                  type="button"
                  onClick={() => toggleSpecialty(specialty.slug)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm font-medium',
                    specialtySlugs.includes(specialty.slug) ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  {specialty.name}
                  {specialtySlugs[0] === specialty.slug && ' (primary)'}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">Consultations</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="consultationFee">Default consultation fee (₹)</Label>
                <Input id="consultationFee" type="number" min={0} max={20000} value={consultationFee} onChange={(e) => { setConsultationFee(Number(e.target.value)); setSaved(false); }} />
              </div>
              <div className="space-y-1.5">
                <Label>Consultation types offered</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(Object.keys(CONSULTATION_TYPE_LABELS) as ConsultationType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleConsultationType(type)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm font-medium',
                        consultationTypes.includes(type) ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {CONSULTATION_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          {saved && !error && <p className="rounded-xl bg-secondary/10 px-3 py-2 text-sm text-secondary">Profile saved.</p>}
          <Button disabled={update.isPending} onClick={handleSave}>
            {update.isPending ? 'Saving…' : 'Save profile'}
          </Button>
        </div>

        <aside className="space-y-4 lg:col-span-1">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-foreground">Status</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Approval</span>
                <Badge variant={profile.approvalStatus === 'APPROVED' ? 'success' : profile.approvalStatus === 'REJECTED' ? 'destructive' : 'warning'}>{profile.approvalStatus.replace('_', ' ')}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Registration No.</span>
                <span className="font-medium text-foreground">{profile.registrationNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rating</span>
                <RatingStars rating={profile.avgRating} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Reviews</span>
                <span className="font-medium text-foreground">{profile.reviewCount}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              <Building2 className="h-4.5 w-4.5" /> Practices at
            </h2>
            {profile.organizations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Independent practice — no clinics linked yet.</p>
            ) : (
              <div className="space-y-2">
                {profile.organizations.map((org) => (
                  <div key={org.organizationId} className="rounded-xl border border-border p-3">
                    <p className="text-sm font-semibold text-foreground">{org.organizationName}</p>
                    <p className="text-xs text-muted-foreground">{org.locality}</p>
                    <p className="mt-1 text-xs font-medium text-foreground">{formatCurrency(org.consultationFee)} consultation fee</p>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">Clinic relationships are managed by the clinic's administrator.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

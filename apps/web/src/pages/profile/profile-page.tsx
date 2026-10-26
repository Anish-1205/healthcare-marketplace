import { useEffect, useState } from 'react';
import type { Gender } from '@carebridge/shared';
import { ChevronRight, ImageOff, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';

const GENDER_OPTIONS: { label: string; value: Gender | '' }[] = [
  { label: 'Not specified', value: '' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Male', value: 'MALE' },
  { label: 'Other', value: 'OTHER' },
  { label: 'Prefer not to say', value: 'UNDISCLOSED' },
];

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  phone: '',
  avatarUrl: '',
  dateOfBirth: '',
  gender: '' as Gender | '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
};

export function ProfilePage() {
  const { data: profile, isLoading, isError, refetch } = useProfile();
  const update = useUpdateProfile();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone ?? '',
      avatarUrl: profile.avatarUrl ?? '',
      dateOfBirth: profile.dateOfBirth ?? '',
      gender: profile.gender ?? '',
      emergencyContactName: profile.emergencyContactName ?? '',
      emergencyContactPhone: profile.emergencyContactPhone ?? '',
      emergencyContactRelation: profile.emergencyContactRelation ?? '',
    });
  }, [profile]);

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (isError || !profile) {
    return (
      <div className="container py-8">
        <ErrorState message="We couldn't load your profile." onRetry={() => refetch()} />
      </div>
    );
  }

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || null,
        avatarUrl: form.avatarUrl.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        emergencyContactName: form.emergencyContactName.trim() || null,
        emergencyContactPhone: form.emergencyContactPhone.trim() || null,
        emergencyContactRelation: form.emergencyContactRelation.trim() || null,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not save your profile.');
    }
  }

  return (
    <div className="container max-w-3xl py-8">
      <PageHeader title="My Profile" subtitle="Keep your details up to date for appointments and deliveries." />

      <form onSubmit={handleSave} className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">Photo</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar firstName={form.firstName} lastName={form.lastName} imageUrl={form.avatarUrl || null} size="lg" />
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <Label htmlFor="avatarUrl">Photo URL</Label>
              <Input id="avatarUrl" type="url" value={form.avatarUrl} onChange={(e) => set('avatarUrl', e.target.value)} placeholder="https://…" />
            </div>
            {form.avatarUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={() => set('avatarUrl', '')}>
                <ImageOff className="h-4 w-4" /> Clear
              </Button>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">Personal details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" required maxLength={60} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" required maxLength={60} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input id="dateOfBirth" type="date" max={new Date().toLocaleDateString('en-CA')} value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Select id="gender" value={form.gender} onChange={(e) => set('gender', e.target.value as Gender | '')}>
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98450 00000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={profile.email} readOnly disabled />
              <p className="text-xs text-muted-foreground">Your sign-in email can't be changed here.</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">Emergency contact</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="emergencyContactName">Name</Label>
              <Input id="emergencyContactName" maxLength={100} value={form.emergencyContactName} onChange={(e) => set('emergencyContactName', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergencyContactPhone">Phone</Label>
              <Input id="emergencyContactPhone" type="tel" value={form.emergencyContactPhone} onChange={(e) => set('emergencyContactPhone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergencyContactRelation">Relationship</Label>
              <Input id="emergencyContactRelation" maxLength={50} value={form.emergencyContactRelation} onChange={(e) => set('emergencyContactRelation', e.target.value)} placeholder="e.g. Spouse" />
            </div>
          </div>
        </section>

        <Link to="/profile/addresses" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft interactive-card">
          <MapPin className="h-5 w-5 text-primary" />
          <span className="flex-1 text-sm font-semibold text-foreground">Saved addresses</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {saved && !error && <p className="rounded-xl bg-secondary/10 px-3 py-2 text-sm text-secondary">Profile saved.</p>}
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save profile'}
        </Button>
      </form>
    </div>
  );
}

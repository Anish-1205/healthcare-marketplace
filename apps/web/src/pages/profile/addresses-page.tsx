import { useState } from 'react';
import type { SavedAddress } from '@carebridge/shared';
import { MapPin, Plus } from 'lucide-react';
import { ApiError } from '@/api/client';
import type { AddressPayload } from '@/api/profile';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAddresses, useDeleteAddress, useSaveAddress } from '@/hooks/use-profile';

const EMPTY_ADDRESS: AddressPayload = {
  label: 'Home',
  recipient: '',
  phone: '',
  line1: '',
  line2: null,
  landmark: null,
  locality: '',
  city: '',
  state: '',
  postalCode: '',
  isDefault: false,
};

const FIELDS: { key: keyof AddressPayload; label: string; required?: boolean; wide?: boolean; inputMode?: 'numeric' | 'tel' }[] = [
  { key: 'label', label: 'Label (e.g. Home, Work)', required: true },
  { key: 'recipient', label: 'Recipient name', required: true },
  { key: 'phone', label: 'Phone', required: true, inputMode: 'tel' },
  { key: 'line1', label: 'Address line 1', required: true, wide: true },
  { key: 'line2', label: 'Address line 2', wide: true },
  { key: 'landmark', label: 'Landmark' },
  { key: 'locality', label: 'Locality', required: true },
  { key: 'city', label: 'City', required: true },
  { key: 'state', label: 'State', required: true },
  { key: 'postalCode', label: 'PIN code', required: true, inputMode: 'numeric' },
];

function AddressForm({ initial, onDone }: { initial?: SavedAddress; onDone: () => void }) {
  const save = useSaveAddress();
  const [form, setForm] = useState<AddressPayload>(() => {
    if (!initial) return EMPTY_ADDRESS;
    const { id: _id, ...rest } = initial;
    return rest;
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await save.mutateAsync({ id: initial?.id, payload: { ...form, line2: form.line2?.trim() || null, landmark: form.landmark?.trim() || null } });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not save this address.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-foreground">{initial ? 'Edit address' : 'Add a new address'}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key} className={field.wide ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
            <Label htmlFor={`address-${field.key}`}>{field.label}</Label>
            <Input
              id={`address-${field.key}`}
              required={field.required}
              inputMode={field.inputMode}
              pattern={field.key === 'postalCode' ? '\\d{6}' : undefined}
              value={(form[field.key] as string | null) ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      {!initial?.isDefault && (
        <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))} />
          Make this my default address
        </label>
      )}
      {error && <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save address'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function AddressesPage() {
  const { data: addresses, isLoading, isError, refetch } = useAddresses();
  const remove = useDeleteAddress();
  // null = no form open, 'new' = adding, otherwise the id being edited.
  const [editing, setEditing] = useState<string | null>(null);

  const addButton = (
    <Button onClick={() => setEditing('new')} disabled={editing !== null}>
      <Plus className="h-4 w-4" /> Add address
    </Button>
  );

  return (
    <div className="container max-w-3xl py-8">
      <PageHeader title="Saved Addresses" subtitle="Used for medicine deliveries and home lab collections." action={addresses?.length ? addButton : undefined} />

      <div className="space-y-4">
        {editing === 'new' && <AddressForm onDone={() => setEditing(null)} />}

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isError ? (
          <ErrorState message="We couldn't load your addresses." onRetry={() => refetch()} />
        ) : !addresses?.length ? (
          editing !== 'new' && <EmptyState icon={MapPin} title="No saved addresses yet" description="Add one to speed up checkout." action={addButton} />
        ) : (
          addresses.map((address) =>
            editing === address.id ? (
              <AddressForm key={address.id} initial={address} onDone={() => setEditing(null)} />
            ) : (
              <div key={address.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{address.label}</p>
                  {address.isDefault && <Badge>Default</Badge>}
                </div>
                <p className="mt-1 text-sm text-foreground">
                  {address.recipient} · {address.phone}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[address.line1, address.line2, address.landmark, address.locality, address.city, address.state].filter(Boolean).join(', ')} – {address.postalCode}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" disabled={editing !== null} onClick={() => setEditing(address.id)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Delete the "${address.label}" address?`)) remove.mutate(address.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
}
